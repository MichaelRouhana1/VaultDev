/**
 * Per-process sliding-window limiter for Redis fallback (Node server actions + Edge middleware).
 * Not shared across serverless instances — defense-in-depth when Upstash is down or unset.
 */
export class MemorySlidingWindow {
  private readonly store = new Map<string, number[]>();

  constructor(
    private readonly maxRequests: number,
    private readonly windowMs: number,
    private readonly maxKeys = 20_000,
  ) {}

  /**
   * Returns whether the request is allowed and suggested retry delay when denied.
   */
  consume(key: string): { allowed: boolean; retryAfterMs: number } {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    let timestamps = this.store.get(key) ?? [];
    timestamps = timestamps.filter((t) => t > cutoff);

    if (timestamps.length >= this.maxRequests) {
      const oldest = timestamps[0]!;
      return {
        allowed: false,
        retryAfterMs: Math.max(0, oldest + this.windowMs - now),
      };
    }

    timestamps.push(now);
    this.store.set(key, timestamps);

    if (this.store.size > this.maxKeys) {
      this.evict(cutoff);
    }

    return { allowed: true, retryAfterMs: 0 };
  }

  private evict(cutoff: number): void {
    for (const [k, arr] of this.store) {
      const next = arr.filter((t) => t > cutoff);
      if (next.length === 0) this.store.delete(k);
      else this.store.set(k, next);
    }
    if (this.store.size > this.maxKeys) {
      let removed = 0;
      const target = Math.floor(this.maxKeys / 2);
      for (const k of this.store.keys()) {
        this.store.delete(k);
        removed++;
        if (removed >= target) break;
      }
    }
  }
}
