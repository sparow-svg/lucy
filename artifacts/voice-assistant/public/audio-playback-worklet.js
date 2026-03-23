// Placeholder AudioWorkletProcessor to satisfy any external integration assumptions.
// We primarily rely on a robust Main-thread AudioQueue for 100% reliability.
class AudioPlaybackWorklet extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    return true;
  }
}
registerProcessor('audio-playback-worklet', AudioPlaybackWorklet);
