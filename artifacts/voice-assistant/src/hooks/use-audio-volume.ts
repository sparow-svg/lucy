import { useState, useEffect, useRef } from "react";

/**
 * Connects to the user's microphone to extract real-time volume data.
 * Used to drive visual animations (like the pulsing orb).
 */
export function useAudioVolume(isActive: boolean) {
  const [volume, setVolume] = useState(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!isActive) {
      setVolume(0);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    async function initAudio() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioCtxRef.current = audioCtx;
        
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;
        
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateVolume = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          
          // Normalize volume to 0-1 range roughly
          const average = sum / dataArray.length;
          const normalized = Math.min(average / 128, 1);
          
          // Smooth out the volume
          setVolume(prev => prev * 0.5 + normalized * 0.5);
          
          rafRef.current = requestAnimationFrame(updateVolume);
        };

        updateVolume();
      } catch (err) {
        console.error("Microphone access denied or error:", err);
      }
    }

    initAudio();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (audioCtxRef.current?.state !== 'closed') {
        audioCtxRef.current?.close();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [isActive]);

  return volume;
}
