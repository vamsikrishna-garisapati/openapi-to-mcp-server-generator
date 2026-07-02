export interface Statistics {
  start(stage: string): void;
  end(stage: string): void;
  increment(metric: string, value?: number): void;
  snapshot(): Record<string, number>;
}

export function createStatistics(): Statistics {
  const metrics: Record<string, number> = {};
  const stageStarts = new Map<string, number>();

  return {
    start(stage: string) {
      stageStarts.set(stage, Date.now());
    },
    end(stage: string) {
      const start = stageStarts.get(stage);
      if (start !== undefined) {
        metrics[`${stage}DurationMs`] = Date.now() - start;
        stageStarts.delete(stage);
      }
    },
    increment(metric: string, value = 1) {
      metrics[metric] = (metrics[metric] ?? 0) + value;
    },
    snapshot() {
      return { ...metrics };
    },
  };
}
