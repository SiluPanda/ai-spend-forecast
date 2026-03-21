import type { ConfidenceBound, ForecastPoint } from '../types.js';
import { mean, standardDeviation } from '../stats/descriptive.js';
import { maConfidenceBounds } from '../stats/confidence.js';

export interface SmaInput {
  costs: number[];
  window: number;
  horizon: number;
  confidenceLevels: number[];
  dates: string[];
  floor: number;
}

/**
 * Simple Moving Average forecast.
 * Produces a flat-line forecast at the mean of the last `window` values.
 */
export function computeSma(input: SmaInput): ForecastPoint[] {
  const { costs, window, horizon, confidenceLevels, dates, floor } = input;
  const windowValues = costs.slice(-window);
  const smaValue = Math.max(floor, mean(windowValues));
  const stdDev = standardDeviation(windowValues, false);

  const predictions: ForecastPoint[] = [];
  for (let i = 0; i < horizon; i++) {
    const bounds: ConfidenceBound[] = confidenceLevels.map(level => {
      const { lower, upper } = maConfidenceBounds(smaValue, stdDev, level, floor);
      return { level, lower, upper };
    });

    predictions.push({
      date: dates[i],
      predicted: smaValue,
      bounds,
    });
  }

  return predictions;
}
