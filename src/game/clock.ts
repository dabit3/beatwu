export interface Clock {
  start(): void;
  stop(): number;
  elapsed(): number;
  isRunning(): boolean;
  subscribe(listener: () => void): () => void;
  getSnapshot(): number;
}

/** A race clock that ticks once per animation frame while running. */
export function createClock(now: () => number = () => performance.now()): Clock {
  let startedAt: number | null = null;
  let stoppedAt: number | null = null;
  let snapshot = 0;
  let frame = 0;
  const listeners = new Set<() => void>();

  const elapsed = () => (startedAt === null ? 0 : ((stoppedAt ?? now()) - startedAt) / 1000);
  const emit = () => {
    snapshot = elapsed();
    listeners.forEach((l) => l());
  };
  const loop = () => {
    emit();
    frame = requestAnimationFrame(loop);
  };

  return {
    start() {
      startedAt = now();
      stoppedAt = null;
      cancelAnimationFrame(frame);
      loop();
    },
    stop() {
      if (startedAt !== null && stoppedAt === null) {
        stoppedAt = now();
        cancelAnimationFrame(frame);
        emit();
      }
      return elapsed();
    },
    elapsed,
    isRunning: () => startedAt !== null && stoppedAt === null,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,
  };
}
