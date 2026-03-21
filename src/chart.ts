import type { ChartDataOptions, ChartPoint, ForecastResult } from './types.js';

/**
 * Convert a ForecastResult into chart-ready data points.
 */
export function toChartData(
  result: ForecastResult,
  options?: ChartDataOptions,
): ChartPoint[] {
  const includeHistory = options?.includeHistory ?? true;
  const confidenceLevels = result.predictions[0]?.bounds.map(b => b.level) ?? [];
  const confidenceLevel = options?.confidenceLevel ?? Math.max(...confidenceLevels);

  const points: ChartPoint[] = [];

  if (includeHistory) {
    for (const record of result.history) {
      points.push({
        date: record.date,
        actual: record.cost ?? 0,
        predicted: null,
        upperBound: null,
        lowerBound: null,
      });
    }
  }

  for (const prediction of result.predictions) {
    const bound = prediction.bounds.find(b => b.level === confidenceLevel);
    points.push({
      date: prediction.date,
      actual: null,
      predicted: prediction.predicted,
      upperBound: bound?.upper ?? null,
      lowerBound: bound?.lower ?? null,
    });
  }

  return points;
}
