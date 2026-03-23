import { useState, useRef, useEffect, useCallback } from "react";
import { AudioQueue } from "@/lib/audio-queue";

export type AssistantState = 'dormant' | 'idle' | 'listening' | 'thinking' | 'speaking';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const SILENCE_THRESHOLD = 0.013;
const BARGE_IN_THRESHOLD = 0.026;
const SILENCE_MS = 400;
const POLL_MS = 60;
const MAX_MSGS = 6;

export function useAssistant() {
  const [state, setState] = useState<AssistantState>('dormant');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [micVolume, setMicVolume] = useState(0);
  const [isSessionActive, setIsSessionActive] = useState(false);

  // Stable refs — callbacks always see fresh values
  const stateRef = useRef<AssistantState>('dormant');
  const queue = useRef(new AudioQueue());
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const convId = useRef<number | null>(null);
  const micStream = useRef<MediaStream | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const sharedCtx = useRef<AudioContext | null>(null); // ONE AudioContext for both mic + playback
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const silenceStart = useRef<number | null>(null);
  const hasInit = useRef(false);
  const hasGreeted = useRef(false);
  const isActivated = useRef(false);
  const isProcessing = useRef(false);
  const isSessionRef = useRef(false);
  const abortCtrl = useRef<AbortController | null>(null);

  const setStateSafe = (s: AssistantState) => {
    stateRef.current = s;
    setState(s);
  };

  // ── SSE reader ──────────────────────────────────────────────────────────
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

  // ── Message helpers ──────────────────────────────────────────────────────
  const pushMsg = (msg: ChatMessage) =>
    setMessages(prev => [...prev, msg].slice(-MAX_MSGS));

  const patchMsg = (id: string, content: string) =>
    setMessages(prev => prev.map(m => m.id === id ? { ...m, content } : m));

  // ── Open persistent mic + AudioContext (called once on activation) ────────
  const openMic = async () => {
    if (micStream.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStream.current = stream;

      // ONE shared AudioContext for both mic analysis and TTS playback
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      sharedCtx.current = ctx;

      // Resume immediately — mic permission counts as user interaction
      if (ctx.state === 'suspended') {
        try { await ctx.resume(); } catch { /* ignore */ }
      }

      // Give AudioQueue the same context so it never creates its own
      queue.current.setContext(ctx);

      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser();
      an.fftSize = 256;
      an.smoothingTimeConstant = 0.8;
      src.connect(an);
      analyser.current = an;
    } catch { /* mic denied */ }
  };

  // ── Volume polling ────────────────────────────────────────────────────────
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

      const s = stateRef.current;

      // Barge-in while Lucy speaks
      if (s === 'speaking' && rms > BARGE_IN_THRESHOLD) {
        queue.current.stop();
        if (abortCtrl.current) { abortCtrl.current.abort(); abortCtrl.current = null; }
        isProcessing.current = false;
        silenceStart.current = null;
        doStartListening();
        return;
      }

      // Silence detection while listening
      if (s === 'listening') {
        if (rms < SILENCE_THRESHOLD) {
          if (!silenceStart.current) silenceStart.current = Date.now();
          else if (Date.now() - silenceStart.current > SILENCE_MS) {
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

  // ── Listen / stop ─────────────────────────────────────────────────────────
  // Using stable refs so no stale-closure issues in intervals/timeouts
  const doStartListening = useCallback(() => {
    const stream = micStream.current;
    if (!stream) return;
    if (isProcessing.current) return;
    const s = stateRef.current;
    if (s === 'thinking' || s === 'speaking' || s === 'listening') return;

    chunks.current = [];
    try {
      const rec = new MediaRecorder(stream);
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
  }, []);

  const doStopListening = useCallback(() => {
    silenceStart.current = null;
    if (recorder.current?.state === 'recording') {
      recorder.current.stop();
      setStateSafe('thinking');
    }
  }, []);

  // ── Process voice input ───────────────────────────────────────────────────
  const doProcessVoice = useCallback(async (blob: Blob) => {
    if (isProcessing.current) return;
    if (!convId.current) { setStateSafe('idle'); return; }
    isProcessing.current = true;

    // Ensure the AudioContext is running before we start (re-resume if needed)
    const ctx = sharedCtx.current;
    if (ctx && ctx.state === 'suspended') {
      try { await ctx.resume(); } catch { /* ignore */ }
    }

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

      const resp = await fetch(`/api/openai/conversations/${convId.current}/voice-messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: base64 }),
        signal: ctrl.signal,
      });

      if (!resp.ok) throw new Error(`voice failed: ${resp.status}`);

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
      // Aborted or network error — go idle so loop can continue
      if ((err as Error)?.name !== 'AbortError') {
        console.error('[Lucy] voice error:', err);
      }
      setStateSafe('idle');
    } finally {
      isProcessing.current = false;
      abortCtrl.current = null;
    }
  }, []);

  // ── Speaking → idle → listen loop ─────────────────────────────────────────
  // Polls every 100ms; if speaking and audio queue is done, auto-restart listening
  useEffect(() => {
    const iv = setInterval(() => {
      if (stateRef.current === 'speaking' && !queue.current.isPlaying) {
        setStateSafe('idle');
        if (isSessionRef.current && !isProcessing.current) {
          setTimeout(() => {
            if (stateRef.current === 'idle' && !isProcessing.current) {
              doStartListening();
            }
          }, 120);
        }
      }
    }, 100);
    return () => clearInterval(iv);
  }, [doStartListening]);

  // ── Greeting ────────────────────────────────────────────────────────────────
  const doGreet = useCallback(async () => {
    if (hasGreeted.current) return;
    hasGreeted.current = true;
    if (!convId.current) { setStateSafe('idle'); return; }

    // Ensure AudioContext is running before greeting audio arrives
    const ctx = sharedCtx.current;
    if (ctx && ctx.state === 'suspended') {
      try { await ctx.resume(); } catch { /* ignore */ }
    }

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

  // ── Init: pre-create conversation once ────────────────────────────────────
  useEffect(() => {
    if (hasInit.current) return;
    hasInit.current = true;
    fetch('/api/openai/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Lucy Session' }),
    })
      .then(r => r.json())
      .then(c => { convId.current = c.id; })
      .catch(() => {});
  }, []);

  // ── Wake-word via SpeechRecognition ────────────────────────────────────────
  useEffect(() => {
    const SRClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SRClass) return;

    let alive = true;
    let recognition: SpeechRecognition | null = null;

    const start = () => {
      if (!alive || isActivated.current) return;
      try {
        recognition = new SRClass();
        recognition.continuous = false; // Safari-safe: restart manually
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.maxAlternatives = 1;

        recognition.onresult = async (e: SpeechRecognitionEvent) => {
          if (isActivated.current) return;
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const t = e.results[i][0].transcript.toLowerCase().trim();
            if (t.includes('lucy') || t.includes('luci')) {
              isActivated.current = true;
              isSessionRef.current = true;
              setIsSessionActive(true);
              recognition?.abort();
              await openMic();
              startPoll();
              doGreet();
              return;
            }
          }
        };

        recognition.onend = () => {
          if (!isActivated.current && alive) {
            setTimeout(start, 200);
          }
        };

        recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
          if (!isActivated.current && alive && e.error !== 'not-allowed') {
            setTimeout(start, 300);
          }
        };

        recognition.start();
      } catch { /* ignore */ }
    };

    start();

    return () => {
      alive = false;
      try { recognition?.abort(); } catch { /* ignore */ }
    };
  }, [doGreet]);

  // ── Manual orb tap ────────────────────────────────────────────────────────
  const toggleRecording = useCallback(() => {
    if (!isSessionRef.current) return;
    const s = stateRef.current;
    if (s === 'listening') {
      doStopListening();
    } else if (s === 'idle') {
      doStartListening();
    } else if (s === 'speaking') {
      queue.current.stop();
      if (abortCtrl.current) { abortCtrl.current.abort(); abortCtrl.current = null; }
      isProcessing.current = false;
      doStartListening();
    }
  }, [doStartListening, doStopListening]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopPoll();
      queue.current.stop();
      if (abortCtrl.current) abortCtrl.current.abort();
      if (micStream.current) micStream.current.getTracks().forEach(t => t.stop());
      if (sharedCtx.current) sharedCtx.current.close().catch(() => {});
    };
  }, []);

  return { state, messages, micVolume, isSessionActive, toggleRecording };
}
