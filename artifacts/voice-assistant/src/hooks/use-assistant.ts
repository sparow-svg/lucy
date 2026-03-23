import { useState, useRef, useEffect, useCallback } from "react";
import { AudioQueue } from "@/lib/audio-queue";
import { useGetAssistantContext } from "@/hooks/use-queries";

export type AssistantState = 'dormant' | 'idle' | 'listening' | 'thinking' | 'speaking';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const SILENCE_THRESHOLD = 0.013;
const BARGE_IN_THRESHOLD = 0.025;
const SILENCE_TIMEOUT_MS = 400;
const VOLUME_POLL_MS = 60; // 60ms interval — Safari friendly
const MAX_MESSAGES = 6;    // Keep transcript short

export function useAssistant() {
  const [state, setState] = useState<AssistantState>('dormant');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [micVolume, setMicVolume] = useState(0);
  const [isSessionActive, setIsSessionActive] = useState(false);

  // Refs — stable across renders
  const audioQueueRef = useRef<AudioQueue>(new AudioQueue());
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const convIdRef = useRef<number | null>(null);
  const stateRef = useRef<AssistantState>('dormant');
  const hasGreetedRef = useRef(false);
  const sessionActiveRef = useRef(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const volumePollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const silenceStartRef = useRef<number | null>(null);

  // Keep stateRef in sync
  useEffect(() => { stateRef.current = state; }, [state]);

  const { data: contextData } = useGetAssistantContext({
    query: { retry: false, refetchOnWindowFocus: false }
  });

  // --- SSE parser ---
  const parseSSE = useCallback(async (
    response: Response,
    onTranscript: (text: string) => void,
    onAudio: (base64: string) => void,
    onDone: () => void
  ) => {
    if (!response.body) return;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';
        for (const block of lines) {
          const dataLine = block.split('\n').find(l => l.startsWith('data: '));
          if (!dataLine) continue;
          const dataStr = dataLine.slice(6);
          if (dataStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.type === 'transcript' || parsed.content) onTranscript(parsed.data || parsed.content);
            else if (parsed.type === 'audio') onAudio(parsed.data);
            else if (parsed.done) onDone();
          } catch { /* malformed */ }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }, []);

  // --- Persistent mic stream — open once per session ---
  const openMicStream = useCallback(async () => {
    if (micStreamRef.current) return; // already open
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      micCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;
    } catch { /* mic denied */ }
  }, []);

  // --- Volume polling — throttled to VOLUME_POLL_MS ---
  const startVolumePolling = useCallback(() => {
    if (volumePollRef.current) return;
    const dataArr = new Uint8Array(analyserRef.current?.frequencyBinCount ?? 64);

    volumePollRef.current = setInterval(() => {
      const analyser = analyserRef.current;
      if (!analyser) return;
      analyser.getByteTimeDomainData(dataArr);
      let sum = 0;
      for (let i = 0; i < dataArr.length; i++) {
        const v = (dataArr[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / dataArr.length);
      const vol = Math.min(1, rms * 7);
      setMicVolume(vol);

      const currentState = stateRef.current;

      // Barge-in: user speaks while Lucy is speaking
      if (currentState === 'speaking' && rms > BARGE_IN_THRESHOLD) {
        audioQueueRef.current.stop();
        setState('idle');
        silenceStartRef.current = null;
        startRecordingFromStream();
        return;
      }

      // Silence detection while listening
      if (currentState === 'listening') {
        if (rms < SILENCE_THRESHOLD) {
          if (silenceStartRef.current === null) {
            silenceStartRef.current = Date.now();
          } else if (Date.now() - silenceStartRef.current > SILENCE_TIMEOUT_MS) {
            silenceStartRef.current = null;
            if (mediaRecorderRef.current?.state === 'recording') {
              mediaRecorderRef.current.stop();
            }
          }
        } else {
          silenceStartRef.current = null;
        }
      }
    }, VOLUME_POLL_MS);
  }, []);

  const stopVolumePolling = useCallback(() => {
    if (volumePollRef.current) {
      clearInterval(volumePollRef.current);
      volumePollRef.current = null;
    }
    setMicVolume(0);
  }, []);

  // --- Add message — cap at MAX_MESSAGES ---
  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages(prev => [...prev, msg].slice(-MAX_MESSAGES));
  }, []);

  const updateMessage = useCallback((id: string, content: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, content } : m));
  }, []);

  // --- Recording from persistent stream ---
  const startRecordingFromStream = useCallback(() => {
    const stream = micStreamRef.current;
    if (!stream) return;
    if (stateRef.current === 'thinking') return;

    audioChunksRef.current = [];
    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType });
      await processVoiceInput(blob);
    };

    recorder.start();
    setState('listening');
    silenceStartRef.current = null;
  }, []);

  // --- Process voice input ---
  const processVoiceInput = useCallback(async (blob: Blob) => {
    const convId = convIdRef.current;
    if (!convId) { setState('idle'); return; }

    try {
      setState('thinking');
      const base64Audio = await blobToBase64(blob);

      const res = await fetch(`/api/openai/conversations/${convId}/voice-messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: base64Audio })
      });

      if (!res.ok) throw new Error('voice failed');

      setState('speaking');
      let accumulated = '';
      const msgId = crypto.randomUUID();
      addMessage({ id: msgId, role: 'assistant', content: '' });

      await parseSSE(res,
        (text) => { accumulated += text; updateMessage(msgId, accumulated); },
        (audio) => audioQueueRef.current.playChunk(audio),
        () => { /* no-op: poll handles state */ }
      );
    } catch {
      setState('idle');
    }
  }, [parseSSE, addMessage, updateMessage]);

  // --- Poll speaking end + auto-restart listening ---
  useEffect(() => {
    const interval = setInterval(() => {
      if (stateRef.current === 'speaking' && !audioQueueRef.current.isCurrentlyPlaying) {
        setState('idle');
        if (sessionActiveRef.current) {
          setTimeout(() => {
            if (stateRef.current === 'idle') startRecordingFromStream();
          }, 120);
        }
      }
    }, 200);
    return () => clearInterval(interval);
  }, [startRecordingFromStream]);

  // --- Greeting --- fires once per session ---
  const triggerGreeting = useCallback(async () => {
    if (hasGreetedRef.current) return;
    hasGreetedRef.current = true;

    try {
      setState('thinking');
      const res = await fetch('/api/openai/proactive-greeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: JSON.stringify(contextData ?? {}) })
      });
      if (!res.ok) throw new Error('greeting failed');

      setState('speaking');
      let accumulated = '';
      const msgId = crypto.randomUUID();
      addMessage({ id: msgId, role: 'assistant', content: '' });

      await parseSSE(res,
        (text) => { accumulated += text; updateMessage(msgId, accumulated); },
        (audio) => audioQueueRef.current.playChunk(audio),
        () => { /* poll handles transition */ }
      );
    } catch {
      setState('idle');
    }
  }, [contextData, parseSSE, addMessage, updateMessage]);

  // --- Pre-create conversation + wake-word setup ---
  useEffect(() => {
    // Pre-create conversation silently
    fetch('/api/openai/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Lucy Session' })
    }).then(r => r.json()).then(conv => {
      convIdRef.current = conv.id;
    }).catch(() => {});
  }, []);

  // --- Wake-word via SpeechRecognition ---
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const recognition: SpeechRecognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    recognition.onresult = async (event: SpeechRecognitionEvent) => {
      if (sessionActiveRef.current) return;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript.toLowerCase();
        if (t.includes('lucy') || t.includes('luci') || t.includes('lousy')) {
          sessionActiveRef.current = true;
          setIsSessionActive(true);
          recognition.stop();
          await openMicStream();
          startVolumePolling();
          triggerGreeting();
          break;
        }
      }
    };

    recognition.onend = () => {
      if (!sessionActiveRef.current) {
        try { recognition.start(); } catch { /* already running */ }
      }
    };

    try { recognition.start(); } catch { /* already running */ }

    return () => {
      try { recognition.stop(); } catch { /* ignore */ }
    };
  }, [openMicStream, startVolumePolling, triggerGreeting]);

  // --- Toggle recording (manual orb tap) ---
  const toggleRecording = useCallback(() => {
    if (!sessionActiveRef.current) return;
    const s = stateRef.current;
    if (s === 'listening') {
      if (mediaRecorderRef.current?.state === 'recording') {
        silenceStartRef.current = null;
        mediaRecorderRef.current.stop();
        setState('thinking');
      }
    } else if (s === 'idle' || s === 'speaking') {
      if (s === 'speaking') audioQueueRef.current.stop();
      startRecordingFromStream();
    }
  }, [startRecordingFromStream]);

  return {
    state,
    messages,
    micVolume,
    isSessionActive,
    toggleRecording,
  };
}

// --- Utility ---
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
  });
}
