import { useState, useRef, useEffect } from "react";
import { AudioQueue } from "@/lib/audio-queue";
import { useGetAssistantContext } from "@/hooks/use-queries";

export type AssistantState = 'dormant' | 'idle' | 'listening' | 'thinking' | 'speaking';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const SILENCE_TIMEOUT_MS = 400;
const SILENCE_THRESHOLD = 0.012;

export function useAssistant() {
  const [state, setState] = useState<AssistantState>('dormant');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioQueueRef = useRef<AudioQueue>(new AudioQueue());
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const volumeFrameRef = useRef<number | null>(null);

  const { data: contextData } = useGetAssistantContext({
    query: { retry: false, refetchOnWindowFocus: false }
  });

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
          } catch {
            // ignore malformed chunk
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  };

  // Monitor when speaking finishes
  useEffect(() => {
    const interval = setInterval(() => {
      if (state === 'speaking' && !audioQueueRef.current.isCurrentlyPlaying) {
        setState('idle');
      }
    }, 200);
    return () => clearInterval(interval);
  }, [state]);

  const triggerGreeting = async (convId: number) => {
    if (!contextData) return;
    try {
      const res = await fetch('/api/openai/proactive-greeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: JSON.stringify(contextData) })
      });

      if (!res.ok) throw new Error('Greeting failed');

      setState('speaking');
      let accumulatedText = "";
      const msgId = crypto.randomUUID();
      setMessages([{ id: msgId, role: 'assistant', content: '' }]);

      await parseSSE(res,
        (text) => {
          accumulatedText += text;
          setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: accumulatedText } : m));
        },
        (audio) => audioQueueRef.current.playChunk(audio),
        () => setState('idle')
      );
    } catch {
      setState('idle');
    }
  };

  const startSession = async () => {
    if (isSessionActive) return;
    setIsSessionActive(true);

    try {
      setState('thinking');

      const convRes = await fetch('/api/openai/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Lucy Session' })
      });
      if (!convRes.ok) throw new Error('Could not create conversation');
      const conv = await convRes.json();
      setConversationId(conv.id);

      await triggerGreeting(conv.id);
    } catch {
      setState('idle');
    }
  };

  const stopSilenceDetection = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (volumeFrameRef.current) {
      cancelAnimationFrame(volumeFrameRef.current);
      volumeFrameRef.current = null;
    }
  };

  const startSilenceDetection = (stream: MediaStream, onSilence: () => void) => {
    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    source.connect(analyser);
    analyserRef.current = analyser;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    let silenceStart: number | null = null;

    const check = () => {
      analyser.getByteTimeDomainData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const v = (dataArray[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / dataArray.length);

      if (rms < SILENCE_THRESHOLD) {
        if (silenceStart === null) {
          silenceStart = Date.now();
        } else if (Date.now() - silenceStart > SILENCE_TIMEOUT_MS) {
          stopSilenceDetection();
          audioCtx.close();
          onSilence();
          return;
        }
      } else {
        silenceStart = null;
      }

      volumeFrameRef.current = requestAnimationFrame(check);
    };

    volumeFrameRef.current = requestAnimationFrame(check);
  };

  const startRecording = async () => {
    try {
      // Barge-in: immediately stop Lucy's audio
      if (state === 'speaking') {
        audioQueueRef.current.stop();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stopSilenceDetection();
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType });
        stream.getTracks().forEach(t => t.stop());
        await processVoiceInput(blob);
      };

      recorder.start();
      setState('listening');

      // Start silence detection for auto-stop
      startSilenceDetection(stream, () => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
          setState('thinking');
        }
      });

    } catch {
      setState('idle');
    }
  };

  const stopRecording = () => {
    stopSilenceDetection();
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setState('thinking');
    }
  };

  const processVoiceInput = async (blob: Blob) => {
    if (!conversationId) {
      setState('idle');
      return;
    }

    try {
      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
      });

      const res = await fetch(`/api/openai/conversations/${conversationId}/voice-messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: base64Audio })
      });

      if (!res.ok) throw new Error('Voice failed');

      setState('speaking');
      let accumulatedText = "";
      const msgId = crypto.randomUUID();
      setMessages(prev => [...prev, { id: msgId, role: 'assistant', content: '' }]);

      await parseSSE(res,
        (text) => {
          accumulatedText += text;
          setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: accumulatedText } : m));
        },
        (audio) => audioQueueRef.current.playChunk(audio),
        () => setState('idle')
      );
    } catch {
      setState('idle');
    }
  };

  const toggleRecording = () => {
    if (!isSessionActive) return;
    if (state === 'listening') {
      stopRecording();
    } else if (state === 'idle' || state === 'speaking') {
      startRecording();
    }
  };

  return {
    state,
    messages,
    isSessionActive,
    startSession,
    toggleRecording,
  };
}
