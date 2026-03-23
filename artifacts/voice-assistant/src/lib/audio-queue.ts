/**
 * PCM16 Audio Queue — seamless streaming playback.
 * Safari-safe: one persistent AudioContext, stops sources in-place.
 */
export class AudioQueue {
  private ctx: AudioContext | null = null;
  private nextStartTime = 0;
  private sources: AudioBufferSourceNode[] = [];
  private _hasScheduled = false;

  private ctx_(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  playChunk(base64: string) {
    const ctx = this.ctx_();
    this._hasScheduled = true;

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const pcm = new Int16Array(bytes.buffer);
    const f32 = new Float32Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) f32[i] = pcm[i] / 32768;

    const buf = ctx.createBuffer(1, f32.length, 24000);
    buf.getChannelData(0).set(f32);

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);

    const now = ctx.currentTime;
    if (this.nextStartTime < now) this.nextStartTime = now + 0.01;
    src.start(this.nextStartTime);
    this.nextStartTime += buf.duration;

    this.sources.push(src);
    src.onended = () => { this.sources = this.sources.filter(s => s !== src); };
  }

  stop() {
    for (const s of this.sources) {
      try { s.stop(0); } catch { /* already stopped */ }
      try { s.disconnect(); } catch { /* ignore */ }
    }
    this.sources = [];
    this.nextStartTime = 0;
    this._hasScheduled = false;
  }

  get isPlaying(): boolean {
    if (!this.ctx || this.ctx.state === 'closed') return false;
    return this._hasScheduled && this.ctx.currentTime < this.nextStartTime;
  }
}
