import { useState, useRef, useEffect, useCallback } from "react";
import { AudioQueue } from "@/lib/audio-queue";

export type AssistantState = 'dormant' | 'idle' | 'listening' | 'thinking' | 'speaking';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

// ── Tunable constants ───────────────────────────────────────────────────────
const SILENCE_THRESHOLD       = 0.009;
const BARGE_IN_THRESHOLD      = 0.022;
const SPEECH_THRESHOLD        = 0.015; // RMS above this = user is speaking
const SILENCE_MS              = 500;
const POLL_MS                 = 60;
const MAX_MSGS                = 8;
const SESSION_TIMEOUT_MS      = 45_000;
const AUTO_PAUSE_MS           = 10_000; // Auto-pause after 10s no user speech

export function useAssistant() {
  const [state, setState]               = useState<AssistantState>('dormant');
  const [messages, setMessages]         = useState<ChatMessage[]>([]);
  const [micVolume, setMicVolume]       = useState(0);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isPaused, setIsPaused]         = useState(false);

  // ── Stable refs ─────────────────────────────────────────────────────────
  const stateRef        = useRef<AssistantState>('dormant');
  const isPausedRef     = useRef(false);
  const queue           = useRef(new AudioQueue());
  const recorder        = useRef<MediaRecorder | null>(null);
  const chunks          = useRef<Blob[]>([]);
  const convId          = useRef<number | null>(null);
  const micStream       = useRef<MediaStream | null>(null);
  const analyser        = useRef<AnalyserNode | null>(null);
  const sharedCtx       = useRef<AudioContext | null>(null);
  const pollTimer       = useRef<ReturnType<typeof setInterval> | null>(null);
  const silenceStart    = useRef<number | null>(null);
  const lastUserSpeechMs     = useRef(0);   // Last time user RMS > SPEECH_THRESHOLD
  const lastAutoPauseCheckMs = useRef(0);   // Throttle auto-pause check to 1/s
  const hasInit         = useRef(false);
  const hasGreeted      = useRef(false);
  const isActivated     = useRef(false);
  const isProcessing    = useRef(false);
  const isSessionRef    = useRef(false);
  const abortCtrl       = useRef<AbortController | null>(null);
  const sessionTimeout  = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Callbacks stored in refs so async effects always see the latest version
  const wakeWordStartRef   = useRef<(() => void) | null>(null);
  const resumeSessionRef   = useRef<(() => void) | null>(null);
  const doStartListeningRef = useRef<(() => void) | null>(null);

  const setStateSafe = (s: AssistantState) => {
    stateRef.current = s;
    setState(s);
  };

  // ── Helpers ─────────────────────────────────────────────────────────────
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

  // ── End session: full reset → dormant ────────────────────────────────────
  const endSession = () => {
    stopAudioAndSTT();
    isPausedRef.current  = false;
    setIsPaused(false);
    isSessionRef.current = false;
    isActivated.current  = false;
    hasGreeted.current   = false;
    lastUserSpeechMs.current = 0;
    if (sessionTimeout.current) clearTimeout(sessionTimeout.current);
    setIsSessionActive(false);
    setStateSafe('dormant');
    setMicVolume(0);
    setTimeout(() => wakeWordStartRef.current?.(), 600);
  };

  // ── Pause: stop audio/STT, keep context, re-arm wake-word for "Lucy" ────
  const pauseSession = useCallback(() => {
    stopAudioAndSTT();
    isPausedRef.current  = true;
    setIsPaused(true);
    isActivated.current  = false; // wake-word can fire again
    setStateSafe('idle');
    setMicVolume(0);
    // Re-arm recognition so "Lucy" can resume the session
    setTimeout(() => wakeWordStartRef.current?.(), 400);
  }, []);

  // ── Resume: un-pause, start listening immediately ─────────────────────────
  const resumeSession = () => {
    if (!isSessionRef.current) return;
    isPausedRef.current = false;
    setIsPaused(false);
    isActivated.current  = true;
    lastUserSpeechMs.current = Date.now(); // fresh 10s window
    armSessionTimer();
    doStartListeningRef.current?.();
  };
  resumeSessionRef.current = resumeSession;

  // ── SSE reader ────────────────────────────────────────────────────────────
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

  // ── Open mic + shared AudioContext (once per lifecycle) ───────────────────
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

  // ── Volume poll: barge-in, silence detection, auto-pause ──────────────────
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

      // Track user voice activity
      if (rms > SPEECH_THRESHOLD && isSessionRef.current) {
        lastUserSpeechMs.current = now;
      }

      // Auto-pause check (once per second)
      // Only fires when idle/listening — never while Lucy is thinking/speaking
      if (
        now - lastAutoPauseCheckMs.current > 1_000 &&
        isSessionRef.current &&
        !isPausedRef.current &&
        !isProcessing.current &&
        s !== 'speaking' && s !== 'thinking' &&
        lastUserSpeechMs.current > 0 &&
        now - lastUserSpeechMs.current > AUTO_PAUSE_MS
      ) {
        lastAutoPauseCheckMs.current = now;
        pauseSession();
        return;
      }
      lastAutoPauseCheckMs.current = now;

      if (isPausedRef.current) return; // Don't process audio when paused

      // Barge-in: user speaks while Lucy is talking
      if (s === 'speaking' && rms > BARGE_IN_THRESHOLD) {
        queue.current.stop();
        if (abortCtrl.current) { abortCtrl.current.abort(); abortCtrl.current = null; }
        isProcessing.current = false;
        silenceStart.current = null;
        armSessionTimer();
        doStartListeningRef.current?.();
        return;
      }

      // Silence detection → send audio
      if (s === 'listening') {
        if (rms < SILENCE_THRESHOLD) {
          if (!silenceStart.current) silenceStart.current = now;
          else if (now - silenceStart.current > SILENCE_MS) {
            silenceStart.current = null;
            doStopListening();
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

  // ── Start listening ────────────────────────────────────────────────────────
  const doStartListening = useCallback(() => {
    if (!micStream.current || isProcessing.current || isPausedRef.current) return;
    const s = stateRef.current;
    if (s === 'thinking' || s === 'speaking' || s === 'listening') return;
    armSessionTimer();
    chunks.current = [];
    try {
      const rec = new MediaRecorder(micStream.current);
      recorder.current = rec;
      rec.ondataavailable = e => { if (e.data.size > 0) chunks.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunks.current, { type: rec.mimeType });
        doProcessVoice(blob);
      };
      rec.start();
      setStateSafe('listening');
      silenceStart.current = null;
    } catch {
      setStateSafe('idle');
    }
  }, []); // stable — reads from refs only
  doStartListeningRef.current = doStartListening;

  // ── Stop listening ─────────────────────────────────────────────────────────
  const doStopListening = useCallback(() => {
    silenceStart.current = null;
    if (recorder.current?.state === 'recording') {
      recorder.current.stop();
      setStateSafe('thinking');
    }
  }, []);

  // ── Process voice → gpt-audio → TTS ─────────────────────────────────────
  const doProcessVoice = useCallback(async (blob: Blob) => {
    if (isProcessing.current || isPausedRef.current) return;
    if (!convId.current) { setStateSafe('idle'); return; }
    // Guard: empty or near-empty blob = silence only, skip processing
    if (blob.size < 2000) {
      setStateSafe('idle');
      // Immediately resume listening so conversation continues
      setTimeout(() => doStartListeningRef.current?.(), 100);
      return;
    }
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
          body: JSON.stringify({ audio: base64 }),
          signal: ctrl.signal,
        }
      );
      if (!resp.ok) throw new Error(`voice ${resp.status}`);
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
      if ((err as Error)?.name !== 'AbortError') console.error('[Lucy] voice:', err);
      if (!isPausedRef.current) setStateSafe('idle');
    } finally {
      isProcessing.current = false;
      abortCtrl.current = null;
    }
  }, []);

  // ── Speaking → idle → listen loop ────────────────────────────────────────
  useEffect(() => {
    const iv = setInterval(() => {
      if (stateRef.current === 'speaking' && !queue.current.isPlaying) {
        setStateSafe('idle');
        // Reset user speech timer when Lucy finishes — gives user fresh 10s to respond
        if (isSessionRef.current) lastUserSpeechMs.current = Date.now();
        if (isSessionRef.current && !isProcessing.current && !isPausedRef.current) {
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

  // ── Greeting ─────────────────────────────────────────────────────────────
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
        body: JSON.stringify({}),
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
    } finally {
      abortCtrl.current = null;
    }
  }, []);

  // ── Pre-create conversation ───────────────────────────────────────────────
  useEffect(() => {
    if (hasInit.current) return;
    hasInit.current = true;
    fetch('/api/openai/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Lucy Session' }),
    }).then(r => r.json()).then(c => { convId.current = c.id; }).catch(() => {});
  }, []);

  // ── Wake-word (SpeechRecognition) ─────────────────────────────────────────
  useEffect(() => {
    const SRClass =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SRClass) return;

    let alive = true;
    let recognition: SpeechRecognition | null = null;

    const start = () => {
      // Run when: not yet activated OR session is paused (waiting for "Lucy to continue")
      if (!alive) return;
      if (isActivated.current && !isPausedRef.current) return;
      try {
        recognition = new SRClass();
        recognition.continuous     = false; // Safari-safe: manual restart on onend
        recognition.interimResults = true;
        recognition.lang            = 'en-US';
        recognition.maxAlternatives = 1;

        recognition.onresult = async (e: SpeechRecognitionEvent) => {
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const t = e.results[i][0].transcript.toLowerCase().trim();
            if (t.includes('lucy') || t.includes('luci')) {
              recognition?.abort();

              if (isPausedRef.current && isSessionRef.current) {
                // ── Resume paused session ──
                isActivated.current = true;
                resumeSessionRef.current?.();
              } else if (!isActivated.current) {
                // ── Fresh session start ──
                isActivated.current  = true;
                isSessionRef.current = true;
                setIsSessionActive(true);
                lastUserSpeechMs.current = 0;
                await openMic();
                startPoll();
                doGreet();
              }
              return;
            }
          }
        };

        recognition.onend = () => {
          // Restart if: not yet activated, OR if session is paused
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

  // ── Orb tap: pause if active, resume if paused ───────────────────────────
  const toggleRecording = useCallback(() => {
    if (isPausedRef.current) {
      resumeSessionRef.current?.();
      return;
    }
    if (isSessionRef.current) {
      pauseSession();
    }
  }, [pauseSession]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
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
