/**
 * PCM16 Audio Queue — seamless streaming playback via Web Audio API.
 * Safari-safe: keeps AudioContext alive, stops sources directly (no close/reopen).
 */
export class AudioQueue {
  private ctx: AudioContext | null = null;
  private nextStartTime: number = 0;
  private scheduledSources: AudioBufferSourceNode[] = [];
  private _isPlaying: boolean = false;

  private getCtx(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public async playChunk(base64PCM16: string) {
    const ctx = this.getCtx();
    this._isPlaying = true;

    const binary = atob(base64PCM16);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const pcm16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) float32[i] = pcm16[i] / 32768.0;

    const sampleRate = 24000;
    const buffer = ctx.createBuffer(1, float32.length, sampleRate);
    buffer.getChannelData(0).set(float32);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const currentTime = ctx.currentTime;
    if (this.nextStartTime < currentTime) {
      this.nextStartTime = currentTime + 0.015;
    }

    source.start(this.nextStartTime);
    this.nextStartTime += buffer.duration;

    this.scheduledSources.push(source);
    source.onended = () => {
      this.scheduledSources = this.scheduledSources.filter(s => s !== source);
    };
  }

  public stop() {
    // Stop all scheduled sources immediately — no context teardown
    for (const source of this.scheduledSources) {
      try { source.stop(); } catch { /* already stopped */ }
      source.disconnect();
    }
    this.scheduledSources = [];
    this.nextStartTime = 0;
    this._isPlaying = false;
  }

  public get isCurrentlyPlaying(): boolean {
    if (!this.ctx || this.ctx.state === 'closed') return false;
    return this._isPlaying && this.ctx.currentTime < this.nextStartTime;
  }
}
