import { useState, useRef, useEffect, useCallback } from "react";
import { AudioQueue } from "@/lib/audio-queue";

export type AssistantState = 'dormant' | 'idle' | 'listening' | 'thinking' | 'speaking';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

// ── Tunable constants ───────────────────────────────────────────────────────
const SILENCE_THRESHOLD  = 0.009;
const BARGE_IN_THRESHOLD = 0.022;
const SPEECH_THRESHOLD   = 0.011;
const SILENCE_MS         = 800;
const MAX_RECORD_MS      = 10_000;
const MIN_BLOB_BYTES     = 400;
const POLL_MS            = 60;
const MAX_MSGS           = 2000;
const SESSION_TIMEOUT_MS = 45_000;
const AUTO_PAUSE_MS      = 10_000;

interface ConvCreated {
  id: number;
  title: string;
  createdAt: string;
}

export function useAssistant(
  firstName = "there",
  initialConvId: number | null = null,
  onConvCreated?: (conv: ConvCreated) => void
) {
  const [state, setState]           = useState<AssistantState>('dormant');
  const [messages, setMessages]     = useState<ChatMessage[]>([]);
  const [micVolume, setMicVolume]   = useState(0);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isPaused, setIsPaused]     = useState(false);

  const firstNameRef = useRef(firstName);
  useEffect(() => { firstNameRef.current = firstName; }, [firstName]);

  // Load historical messages when opening an existing conversation
  useEffect(() => {
    if (!initialConvId) return;
    fetch(`/api/openai/conversations/${initialConvId}/messages`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then((msgs: Array<{ id: number; role: string; content: string }>) => {
        const chatMsgs: ChatMessage[] = msgs
          .filter(m => m.content?.trim())
          .map(m => ({
            id: `hist-${m.id}`,
            role: m.role as 'user' | 'assistant',
            content: m.content,
          }));
        if (chatMsgs.length > 0) setMessages(chatMsgs);
      })
      .catch(() => {});
  // Only run on mount — intentionally omit initialConvId from deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const stateRef         = useRef<AssistantState>('dormant');
  const isPausedRef      = useRef(false);
  const queue            = useRef(new AudioQueue());
  const recorder         = useRef<MediaRecorder | null>(null);
  const chunks           = useRef<Blob[]>([]);
  const convId           = useRef<number | null>(initialConvId);
  const micStream        = useRef<MediaStream | null>(null);
  const analyser         = useRef<AnalyserNode | null>(null);
  const sharedCtx        = useRef<AudioContext | null>(null);
  const pollTimer        = useRef<ReturnType<typeof setInterval> | null>(null);
  const silenceStart     = useRef<number | null>(null);
  const recordStart      = useRef<number>(0);
  const lastUserSpeechMs    = useRef(0);
  const lastPauseCheckMs    = useRef(0);
  const hadSpeechInRecording = useRef(false); // true if user actually spoke during this recording
  const hasInit          = useRef(false);
  const hasGreeted       = useRef(false);
  const isActivated      = useRef(false);
  const isProcessing     = useRef(false);
  const isSessionRef     = useRef(false);
  const abortCtrl        = useRef<AbortController | null>(null);
  const sessionTimeout   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wakeWordStartRef    = useRef<(() => void) | null>(null);
  const resumeSessionRef    = useRef<(() => void) | null>(null);
  const doStartListeningRef = useRef<(() => void) | null>(null);
  const doStopListeningRef  = useRef<(() => void) | null>(null);
  const onConvCreatedRef    = useRef(onConvCreated);
  useEffect(() => { onConvCreatedRef.current = onConvCreated; }, [onConvCreated]);

  const setStateSafe = (s: AssistantState) => {
    stateRef.current = s;
    setState(s);
  };

  const stopAudioAndSTT = () => {
    queue.current.stop();
    if (abortCtrl.current) { abortCtrl.current.abort(); abortCtrl.current = null; }
    if (recorder.current?.state === 'recording') {
      try { recorder.current.stop(); } catch { /* ignore */ }
    }
    isProcessing.current = false;
  };

  const armSessionTimer = () => {
    if (sessionTimeout.current) clearTimeout(sessionTimeout.current);
    if (!isSessionRef.current) return;
    sessionTimeout.current = setTimeout(() => endSession(), SESSION_TIMEOUT_MS);
  };

  const endSession = () => {
    stopAudioAndSTT();
    isPausedRef.current  = false;
    setIsPaused(false);
    isSessionRef.current = false;
    isActivated.current  = false;
    // hasGreeted intentionally NOT reset — greeting fires only once per conversation load
    lastUserSpeechMs.current = 0;
    if (sessionTimeout.current) clearTimeout(sessionTimeout.current);
    setIsSessionActive(false);
    setStateSafe('dormant');
    setMicVolume(0);
    setTimeout(() => wakeWordStartRef.current?.(), 600);
  };

  const pauseSession = useCallback(() => {
    stopAudioAndSTT();
    isPausedRef.current  = true;
    setIsPaused(true);
    isActivated.current  = false;
    setStateSafe('idle');
    setMicVolume(0);
    setTimeout(() => wakeWordStartRef.current?.(), 400);
  }, []);

  const resumeSession = () => {
    if (!isSessionRef.current) return;
    isPausedRef.current  = false;
    setIsPaused(false);
    isActivated.current  = true;
    lastUserSpeechMs.current = Date.now();
    armSessionTimer();
    doStartListeningRef.current?.();
  };
  resumeSessionRef.current = resumeSession;

  const readSSE = async (
    res: Response,
    onText: (t: string) => void,
    onAudio: (b: string) => void,
    signal?: AbortSignal
  ) => {
    if (!res.body) return;
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    try {
      while (true) {
        if (signal?.aborted) break;
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split('\n\n');
        buf = parts.pop() ?? '';
        for (const block of parts) {
          const line = block.split('\n').find(l => l.startsWith('data: '));
          if (!line) continue;
          const raw = line.slice(6);
          if (raw === '[DONE]') continue;
          try {
            const p = JSON.parse(raw);
            if (p.type === 'transcript' || p.content) onText(p.data ?? p.content ?? '');
            else if (p.type === 'audio' && p.data) onAudio(p.data);
          } catch { /* skip bad chunk */ }
        }
      }
    } finally {
      reader.releaseLock();
    }
  };

  const pushMsg  = (msg: ChatMessage) =>
    setMessages(prev => [...prev, msg].slice(-MAX_MSGS));
  const patchMsg = (id: string, content: string) =>
    setMessages(prev => prev.map(m => m.id === id ? { ...m, content } : m));

  const openMic = async () => {
    if (micStream.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStream.current = stream;
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      sharedCtx.current = ctx;
      if (ctx.state === 'suspended') { try { await ctx.resume(); } catch { /* ignore */ } }
      queue.current.setContext(ctx);
      const src = ctx.createMediaStreamSource(stream);
      const an  = ctx.createAnalyser();
      an.fftSize = 256;
      an.smoothingTimeConstant = 0.75;
      src.connect(an);
      analyser.current = an;
    } catch { /* mic denied */ }
  };

  const startPoll = () => {
    if (pollTimer.current) return;
    const data = new Uint8Array(analyser.current?.frequencyBinCount ?? 128);

    pollTimer.current = setInterval(() => {
      const an = analyser.current;
      if (!an) return;
      an.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      setMicVolume(Math.min(1, rms * 7));

      const s   = stateRef.current;
      const now = Date.now();

      if (rms > SPEECH_THRESHOLD && isSessionRef.current) {
        lastUserSpeechMs.current = now;
      }

      if (now - lastPauseCheckMs.current > 1_000) {
        lastPauseCheckMs.current = now;
        if (
          isSessionRef.current &&
          !isPausedRef.current &&
          !isProcessing.current &&
          s !== 'speaking' && s !== 'thinking' &&
          lastUserSpeechMs.current > 0 &&
          now - lastUserSpeechMs.current > AUTO_PAUSE_MS
        ) {
          pauseSession();
          return;
        }
      }

      if (isPausedRef.current) return;

      if (s === 'speaking' && rms > BARGE_IN_THRESHOLD && !isProcessing.current) {
        queue.current.stop();
        if (abortCtrl.current) { abortCtrl.current.abort(); abortCtrl.current = null; }
        silenceStart.current = null;
        armSessionTimer();
        doStartListeningRef.current?.();
        return;
      }

      if (s === 'listening') {
        // Track whether the user actually spoke above speech threshold
        if (rms > SPEECH_THRESHOLD) hadSpeechInRecording.current = true;

        if (recordStart.current > 0 && now - recordStart.current > MAX_RECORD_MS) {
          silenceStart.current = null;
          doStopListeningRef.current?.();
          return;
        }
        if (rms < SILENCE_THRESHOLD) {
          if (!silenceStart.current) silenceStart.current = now;
          else if (now - silenceStart.current > SILENCE_MS) {
            silenceStart.current = null;
            doStopListeningRef.current?.();
          }
        } else {
          silenceStart.current = null;
        }
      }
    }, POLL_MS);
  };

  const stopPoll = () => {
    if (pollTimer.current) { clearInterval(pollTimer.current); pollTimer.current = null; }
    setMicVolume(0);
  };

  const doStartListening = useCallback(() => {
    if (!micStream.current || isProcessing.current || isPausedRef.current) return;
    const s = stateRef.current;
    if (s === 'thinking' || s === 'speaking' || s === 'listening') return;
    armSessionTimer();
    chunks.current = [];
    hadSpeechInRecording.current = false; // reset for each new recording
    try {
      const rec = new MediaRecorder(micStream.current);
      recorder.current = rec;
      rec.ondataavailable = e => { if (e.data.size > 0) chunks.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunks.current, { type: rec.mimeType });
        doProcessVoice(blob);
      };
      rec.start();
      recordStart.current = Date.now();
      setStateSafe('listening');
      silenceStart.current = null;
    } catch {
      setStateSafe('idle');
    }
  }, []);
  doStartListeningRef.current = doStartListening;

  const doStopListening = useCallback(() => {
    silenceStart.current = null;
    recordStart.current  = 0;
    if (recorder.current?.state === 'recording') {
      recorder.current.stop();
      setStateSafe('thinking');
    }
  }, []);
  doStopListeningRef.current = doStopListening;

  const doProcessVoice = useCallback(async (blob: Blob) => {
    if (blob.size < MIN_BLOB_BYTES) {
      setStateSafe('idle');
      setTimeout(() => doStartListeningRef.current?.(), 80);
      return;
    }
    // If user never crossed speech threshold, discard — don't call the API for silence
    if (!hadSpeechInRecording.current) {
      setStateSafe('idle');
      setTimeout(() => doStartListeningRef.current?.(), 80);
      return;
    }
    if (isProcessing.current || isPausedRef.current) return;
    if (!convId.current) { setStateSafe('idle'); return; }

    isProcessing.current = true;
    armSessionTimer();
    const ctx = sharedCtx.current;
    if (ctx?.state === 'suspended') { try { await ctx.resume(); } catch { /* ignore */ } }

    try {
      setStateSafe('thinking');

      const base64 = await new Promise<string>((res, rej) => {
        const fr = new FileReader();
        fr.readAsDataURL(blob);
        fr.onloadend = () => res((fr.result as string).split(',')[1]);
        fr.onerror = rej;
      });

      const ctrl = new AbortController();
      abortCtrl.current = ctrl;

      const resp = await fetch(
        `/api/openai/conversations/${convId.current}/voice-messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ audio: base64, firstName: firstNameRef.current }),
          signal: ctrl.signal,
        }
      );

      if (!resp.ok) {
        console.warn('[Lucy] voice API error:', resp.status);
        throw new Error(`voice ${resp.status}`);
      }

      setStateSafe('speaking');
      let text = '';
      const id = crypto.randomUUID();
      pushMsg({ id, role: 'assistant', content: '' });

      await readSSE(resp,
        t => { text += t; patchMsg(id, text); },
        a => { queue.current.playChunk(a); },
        ctrl.signal
      );

    } catch (err) {
      const isAbort = (err as Error)?.name === 'AbortError';
      if (!isAbort) console.error('[Lucy] voice error:', err);
      if (!isPausedRef.current) {
        setStateSafe('idle');
        if (!isAbort) {
          setTimeout(() => {
            if (!isProcessing.current && !isPausedRef.current && isSessionRef.current) {
              doStartListeningRef.current?.();
            }
          }, 200);
        }
      }
    } finally {
      isProcessing.current = false;
      abortCtrl.current    = null;
    }
  }, []);

  useEffect(() => {
    const iv = setInterval(() => {
      if (
        stateRef.current === 'speaking' &&
        !queue.current.isPlaying &&
        !isProcessing.current
      ) {
        setStateSafe('idle');
        if (isSessionRef.current) lastUserSpeechMs.current = Date.now();
        if (isSessionRef.current && !isPausedRef.current) {
          setTimeout(() => {
            if (stateRef.current === 'idle' && !isProcessing.current && !isPausedRef.current) {
              doStartListening();
            }
          }, 120);
        }
      }
    }, 100);
    return () => clearInterval(iv);
  }, [doStartListening]);

  const doGreet = useCallback(async () => {
    if (hasGreeted.current) return;
    hasGreeted.current = true;
    if (!convId.current) { setStateSafe('idle'); return; }
    armSessionTimer();
    const ctx = sharedCtx.current;
    if (ctx?.state === 'suspended') { try { await ctx.resume(); } catch { /* ignore */ } }
    try {
      setStateSafe('thinking');
      const ctrl = new AbortController();
      abortCtrl.current = ctrl;
      const resp = await fetch('/api/openai/proactive-greeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ firstName: firstNameRef.current }),
        signal: ctrl.signal,
      });
      if (!resp.ok) throw new Error('greeting failed');
      setStateSafe('speaking');
      let text = '';
      const id = crypto.randomUUID();
      pushMsg({ id, role: 'assistant', content: '' });
      await readSSE(resp,
        t => { text += t; patchMsg(id, text); },
        a => { queue.current.playChunk(a); },
        ctrl.signal
      );
    } catch {
      setStateSafe('idle');
      setTimeout(() => doStartListeningRef.current?.(), 300);
    } finally {
      abortCtrl.current = null;
    }
  }, []);

  // Create or reuse conversation on mount
  useEffect(() => {
    if (hasInit.current) return;
    hasInit.current = true;
    if (initialConvId !== null) {
      convId.current = initialConvId;
      // Never greet on a conversation the user is resuming
      hasGreeted.current = true;
      return;
    }
    fetch('/api/openai/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ title: '' }),
    })
      .then(r => r.json())
      .then(c => {
        convId.current = c.id;
        onConvCreatedRef.current?.(c);
      })
      .catch(() => {});
  }, [initialConvId]);

  // Wake-word detection
  useEffect(() => {
    const SRClass =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SRClass) return;

    let alive = true;
    let recognition: SpeechRecognition | null = null;

    const start = () => {
      if (!alive) return;
      if (isActivated.current && !isPausedRef.current) return;
      try {
        recognition = new SRClass();
        recognition.continuous     = false;
        recognition.interimResults = true;
        recognition.lang            = 'en-US';
        recognition.maxAlternatives = 1;

        recognition.onresult = async (e: SpeechRecognitionEvent) => {
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const t = e.results[i][0].transcript.toLowerCase().trim();
            if (t.includes('lucy') || t.includes('luci')) {
              recognition?.abort();
              if (isPausedRef.current && isSessionRef.current) {
                isActivated.current = true;
                resumeSessionRef.current?.();
              } else if (!isActivated.current) {
                isActivated.current  = true;
                isSessionRef.current = true;
                setIsSessionActive(true);
                // Seed silence timer from activation so 10s auto-pause fires
                // even if the user never speaks after "Lucy"
                lastUserSpeechMs.current = Date.now();
                await openMic();
                startPoll();
                doGreet();
              }
              return;
            }
          }
        };

        recognition.onend = () => {
          if (alive && (!isActivated.current || isPausedRef.current)) {
            setTimeout(start, 200);
          }
        };

        recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
          if (alive && e.error !== 'not-allowed') setTimeout(start, 300);
        };

        recognition.start();
      } catch { /* ignore */ }
    };

    wakeWordStartRef.current = start;
    start();

    return () => {
      alive = false;
      try { recognition?.abort(); } catch { /* ignore */ }
    };
  }, [doGreet]);

  const toggleRecording = useCallback(() => {
    if (isPausedRef.current) {
      resumeSessionRef.current?.();
    } else if (isSessionRef.current) {
      pauseSession();
    }
  }, [pauseSession]);

  useEffect(() => {
    return () => {
      stopPoll();
      queue.current.stop();
      if (abortCtrl.current) abortCtrl.current.abort();
      if (sessionTimeout.current) clearTimeout(sessionTimeout.current);
      if (micStream.current) micStream.current.getTracks().forEach(t => t.stop());
      if (sharedCtx.current) sharedCtx.current.close().catch(() => {});
    };
  }, []);

  return { state, messages, micVolume, isSessionActive, isPaused, toggleRecording };
}
