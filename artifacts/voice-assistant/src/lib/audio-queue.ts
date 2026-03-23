/**
 * PCM16 Audio Queue — seamless streaming playback.
 *
 * Key design: does NOT create its own AudioContext.
 * Caller must inject one via setContext() so it shares the
 * same context as the mic (avoiding Safari's multi-context limits
 * and the suspended-context trap that breaks the play loop).
 */
export class AudioQueue {
  private ctx: AudioContext | null = null;
  private nextStartTime = 0;
  private sources: AudioBufferSourceNode[] = [];
  private _hasScheduled = false;

  /** Share the mic's AudioContext so both use the same running context. */
  setContext(ctx: AudioContext) {
    this.ctx = ctx;
    this.nextStartTime = 0;
  }

  async playChunk(base64: string) {
    const ctx = this.ctx;
    if (!ctx) return;

    // Ensure context is running before scheduling — the key fix for Safari
    if (ctx.state === 'suspended') {
      try { await ctx.resume(); } catch { return; }
    }
    if (ctx.state !== 'running') return;

    try {
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
      if (this.nextStartTime < now) this.nextStartTime = now + 0.02;
      src.start(this.nextStartTime);
      this.nextStartTime += buf.duration;
      this._hasScheduled = true;

      this.sources.push(src);
      src.onended = () => { this.sources = this.sources.filter(s => s !== src); };
    } catch {
      /* ignore decode / scheduling errors */
    }
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

  /**
   * Returns true only when audio is actively playing.
   * If the AudioContext is not running (suspended/closed), nothing is playing.
   */
  get isPlaying(): boolean {
    if (!this.ctx || this.ctx.state !== 'running') return false;
    if (!this._hasScheduled) return false;
    return this.ctx.currentTime < this.nextStartTime;
  }
}
