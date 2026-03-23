/**
 * A robust, generic PCM16 Audio Queue for streaming playback.
 * Avoids complex AudioWorklet issues by buffering directly in the main thread
 * using standard Web Audio API BufferSources.
 */
export class AudioQueue {
  private ctx: AudioContext | null = null;
  private nextStartTime: number = 0;
  private isPlaying: boolean = false;

  constructor() {
    this.initContext();
  }

  private initContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  public async playChunk(base64PCM16: string) {
    this.initContext();
    if (!this.ctx) return;
    
    this.isPlaying = true;

    // Decode base64 to binary string
    const binary = atob(base64PCM16);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    // Convert Int16 to Float32
    const pcm16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / 32768.0;
    }

    // Create AudioBuffer (assumes 24kHz from OpenAI by default, adjust if needed)
    const sampleRate = 24000;
    const buffer = this.ctx.createBuffer(1, float32.length, sampleRate);
    buffer.getChannelData(0).set(float32);

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.ctx.destination);

    // Schedule seamlessly
    const currentTime = this.ctx.currentTime;
    if (this.nextStartTime < currentTime) {
      this.nextStartTime = currentTime + 0.02; // slight buffer
    }

    source.start(this.nextStartTime);
    this.nextStartTime += buffer.duration;
  }

  public stop() {
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this.nextStartTime = 0;
    this.isPlaying = false;
  }

  public get isCurrentlyPlaying() {
    if (!this.ctx) return false;
    return this.isPlaying && this.ctx.currentTime < this.nextStartTime;
  }
}
