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
const SILENCE_TIMEOUT_MS = 400;

export function useAssistant() {
  const [state, setState] = useState<AssistantState>('dormant');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [micVolume, setMicVolume] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioQueueRef = useRef<AudioQueue>(new AudioQueue());
  const volumeFrameRef = useRef<number | null>(null);
  const silenceStartRef = useRef<number | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const sessionActiveRef = useRef(false);
  const stateRef = useRef<AssistantState>('dormant');
  const convIdRef = useRef<number | null>(null);

  const { data: contextData } = useGetAssistantContext({
    query: { retry: false, refetchOnWindowFocus: false }
  });

  // Keep refs in sync so callbacks don't capture stale state
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { convIdRef.current = conversationId; }, [conversationId]);

  const parseSSE = async (
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
            if (parsed.type === 'transcript' || parsed.content) {
              onTranscript(parsed.data || parsed.content);
            } else if (parsed.type === 'audio') {
              onAudio(parsed.data);
            } else if (parsed.done) {
              onDone();
            }
          } catch { /* ignore */ }
        }
      }
    } finally {
      reader.releaseLock();
    }
  };

  // Poll speaking end
  useEffect(() => {
    const interval = setInterval(() => {
      if (stateRef.current === 'speaking' && !audioQueueRef.current.isCurrentlyPlaying) {
        setState('idle');
        // Auto-restart listening after Lucy speaks
        if (sessionActiveRef.current) {
          setTimeout(() => startRecording(), 150);
        }
      }
    }, 200);
    return () => clearInterval(interval);
  }, []);

  // Pre-create conversation on mount for lower latency
  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/openai/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Lucy Session' })
        });
        if (res.ok) {
          const conv = await res.json();
          setConversationId(conv.id);
          convIdRef.current = conv.id;
        }
      } catch { /* silent */ }
    };
    init();
  }, []);

  const triggerGreeting = useCallback(async () => {
    if (!contextData) return;
    const convId = convIdRef.current;
    if (!convId) return;

    try {
      setState('thinking');
      const res = await fetch('/api/openai/proactive-greeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: JSON.stringify(contextData) })
      });
      if (!res.ok) throw new Error('Greeting failed');

      setState('speaking');
      let accumulated = "";
      const msgId = crypto.randomUUID();
      setMessages([{ id: msgId, role: 'assistant', content: '' }]);

      await parseSSE(res,
        (text) => {
          accumulated += text;
          setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: accumulated } : m));
        },
        (audio) => audioQueueRef.current.playChunk(audio),
        () => { /* handled by poll */ }
      );
    } catch {
      setState('idle');
    }
  }, [contextData]);

  // Wake-word detection via SpeechRecognition
  const startWakeWordDetection = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const recognition: SpeechRecognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (sessionActiveRef.current) return;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.toLowerCase();
        if (transcript.includes('lucy') || transcript.includes('luci')) {
          sessionActiveRef.current = true;
          setIsSessionActive(true);
          recognition.stop();
          triggerGreeting();
          break;
        }
      }
    };

    recognition.onend = () => {
      // Restart if session not yet active
      if (!sessionActiveRef.current) {
        try { recognition.start(); } catch { /* already running */ }
      }
    };

    try { recognition.start(); } catch { /* already running */ }
  }, [triggerGreeting]);

  // Start wake-word once context is ready
  useEffect(() => {
    if (contextData && !isSessionActive) {
      setState('dormant');
      startWakeWordDetection();
    }
  }, [contextData, isSessionActive, startWakeWordDetection]);

  const stopVolumeMonitor = () => {
    if (volumeFrameRef.current) {
      cancelAnimationFrame(volumeFrameRef.current);
      volumeFrameRef.current = null;
    }
    silenceStartRef.current = null;
    setMicVolume(0);
  };

  const startRecording = useCallback(async () => {
    if (stateRef.current === 'thinking' || stateRef.current === 'speaking') return;

    try {
      if (stateRef.current === 'speaking') {
        audioQueueRef.current.stop();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      // Audio context for volume + silence detection
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.82;
      source.connect(analyser);
      const dataArr = new Uint8Array(analyser.frequencyBinCount);

      const checkVolume = () => {
        analyser.getByteTimeDomainData(dataArr);
        let sum = 0;
        for (let i = 0; i < dataArr.length; i++) {
          const v = (dataArr[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / dataArr.length);
        setMicVolume(Math.min(1, rms * 7));

        if (rms < SILENCE_THRESHOLD) {
          if (silenceStartRef.current === null) {
            silenceStartRef.current = Date.now();
          } else if (Date.now() - silenceStartRef.current > SILENCE_TIMEOUT_MS) {
            stopVolumeMonitor();
            audioCtx.close();
            if (mediaRecorderRef.current?.state === 'recording') {
              mediaRecorderRef.current.stop();
            }
            return;
          }
        } else {
          silenceStartRef.current = null;
        }

        volumeFrameRef.current = requestAnimationFrame(checkVolume);
      };

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stopVolumeMonitor();
        audioCtx.close().catch(() => {});
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType });
        stream.getTracks().forEach(t => t.stop());
        await processVoiceInput(blob);
      };

      recorder.start();
      setState('listening');
      silenceStartRef.current = null;
      volumeFrameRef.current = requestAnimationFrame(checkVolume);

    } catch {
      setState('idle');
    }
  }, []);

  const processVoiceInput = useCallback(async (blob: Blob) => {
    const convId = convIdRef.current;
    if (!convId) { setState('idle'); return; }

    try {
      setState('thinking');

      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
      });

      const res = await fetch(`/api/openai/conversations/${convId}/voice-messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: base64Audio })
      });

      if (!res.ok) throw new Error('Voice failed');

      setState('speaking');
      let accumulated = "";
      const msgId = crypto.randomUUID();
      setMessages(prev => [...prev, { id: msgId, role: 'assistant', content: '' }]);

      await parseSSE(res,
        (text) => {
          accumulated += text;
          setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: accumulated } : m));
        },
        (audio) => audioQueueRef.current.playChunk(audio),
        () => { /* handled by poll */ }
      );
    } catch {
      setState('idle');
    }
  }, []);

  const toggleRecording = useCallback(() => {
    if (!isSessionActive) return;
    const s = stateRef.current;
    if (s === 'listening') {
      stopVolumeMonitor();
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
        setState('thinking');
      }
    } else if (s === 'idle' || s === 'speaking') {
      if (s === 'speaking') audioQueueRef.current.stop();
      startRecording();
    }
  }, [isSessionActive, startRecording]);

  return {
    state,
    messages,
    isSessionActive,
    micVolume,
    toggleRecording,
  };
}
