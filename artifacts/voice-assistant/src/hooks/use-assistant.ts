import { useState, useRef, useEffect, useCallback } from "react";
import { AudioQueue } from "@/lib/audio-queue";
import { useGetAssistantContext } from "@/hooks/use-queries";

export type AssistantState = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export function useAssistant() {
  const [state, setState] = useState<AssistantState>('idle');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioQueueRef = useRef<AudioQueue>(new AudioQueue());
  
  // Context query
  const { data: contextData, isSuccess: isContextReady } = useGetAssistantContext({
    query: { retry: false, refetchOnWindowFocus: false }
  });

  const isFirstMount = useRef(true);

  // Parse generic SSE
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
          } catch (e) {
            // Ignore malformed JSON chunks
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  };

  // 1. Proactive Greeting Flow
  useEffect(() => {
    if (isFirstMount.current && isContextReady && contextData) {
      isFirstMount.current = false;
      
      const initiateGreeting = async () => {
        try {
          setState('thinking');
          
          // Create conversation first
          const convRes = await fetch('/api/openai/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'New Session' })
          });
          if (convRes.ok) {
            const conv = await convRes.json();
            setConversationId(conv.id);
          }

          // Trigger greeting
          const res = await fetch('/api/openai/proactive-greeting', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ context: JSON.stringify(contextData) })
          });

          if (!res.ok) throw new Error('Failed to fetch greeting');

          setState('speaking');
          let accumulatedText = "";
          const msgId = Math.random().toString(36).substring(7);

          setMessages([{ id: msgId, role: 'assistant', content: '' }]);

          await parseSSE(res, 
            (text) => {
              accumulatedText += text;
              setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: accumulatedText } : m));
            },
            (audio) => audioQueueRef.current.playChunk(audio),
            () => setState('idle')
          );

        } catch (e) {
          console.error("Proactive greeting failed", e);
          setState('idle');
        }
      };

      initiateGreeting();
    }
  }, [isContextReady, contextData]);

  // Handle stream end check
  useEffect(() => {
    const interval = setInterval(() => {
      if (state === 'speaking' && !audioQueueRef.current.isCurrentlyPlaying) {
        setState('idle');
      }
    }, 500);
    return () => clearInterval(interval);
  }, [state]);


  const startRecording = async () => {
    try {
      // Barge-in: stop playback if speaking
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
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType });
        stream.getTracks().forEach(track => track.stop());
        await processVoiceInput(blob);
      };

      recorder.start();
      setState('listening');
    } catch (err) {
      console.error("Microphone error", err);
      setState('idle');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setState('thinking');
    }
  };

  const processVoiceInput = async (blob: Blob) => {
    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        
        if (!conversationId) {
          console.warn("No conversation ID available.");
          setState('idle');
          return;
        }

        const res = await fetch(`/api/openai/conversations/${conversationId}/voice-messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audio: base64Audio })
        });

        if (!res.ok) throw new Error('Voice message failed');

        setState('speaking');
        let accumulatedText = "";
        const msgId = Math.random().toString(36).substring(7);

        // Add a placeholder user message since the API handles STT but we might want to show it immediately.
        // Actually, the API returns the transcript in the SSE. We'll capture both.
        setMessages(prev => [...prev, { id: msgId + '-u', role: 'user', content: '...' }, { id: msgId, role: 'assistant', content: '' }]);

        let userTranscript = "";

        await parseSSE(res, 
          (text) => {
            // Very hacky check if it's user or assistant transcript based on format.
            // Assuming the API sends assistant transcript. If it sends both, adjust logic.
            accumulatedText += text;
            setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: accumulatedText } : m));
          },
          (audio) => audioQueueRef.current.playChunk(audio),
          () => setState('idle')
        );
      };
    } catch (e) {
      console.error(e);
      setState('idle');
    }
  };

  const toggleRecording = () => {
    if (state === 'listening') {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return {
    state,
    messages,
    toggleRecording
  };
}
