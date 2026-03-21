import type { ConfidenceBound, ForecastPoint } from '../types.js';
import { mean, standardDeviation } from '../stats/descriptive.js';
import { maConfidenceBounds } from '../stats/confidence.js';

export interface EmaInput {
  costs: number[];
  window: number;
  horizon: number;
  confidenceLevels: number[];
  dates: string[];
  alpha?: number;
  floor: number;
}

/**
 * Exponential Moving Average forecast.
 * Initializes with SMA of the first `window` values, then applies exponential smoothing.
 * Forecast is a flat line at the final EMA value.
 */
export function computeEma(input: EmaInput): { predictions: ForecastPoint[]; emaValue: number } {
  const { costs, window, horizon, confidenceLevels, dates, floor } = input;
  const alpha = input.alpha ?? 2 / (window + 1);

  // Initialize EMA with SMA of first `window` values
  const initValues = costs.slice(0, window);
  let ema = mean(initValues);

  // Compute EMA for remaining values
  const residuals: number[] = [];
  for (let i = window; i < costs.length; i++) {
    ema = alpha * costs[i] + (1 - alpha) * ema;
    residuals.push(costs[i] - ema);
  }

  // If no residuals (history == window), compute from window values
  if (residuals.length === 0) {
    // Compute EMA across all values starting from index 0
    ema = costs[0];
    for (let i = 1; i < costs.length; i++) {
      ema = alpha * costs[i] + (1 - alpha) * ema;
      residuals.push(costs[i] - ema);
    }
  }

  const emaValue = Math.max(floor, ema);
  const stdDev = residuals.length > 1 ? standardDeviation(residuals, false) : standardDeviation(costs.slice(-window), false);

  const predictions: ForecastPoint[] = [];
  for (let i = 0; i < horizon; i++) {
    const bounds: ConfidenceBound[] = confidenceLevels.map(level => {
      const { lower, upper } = maConfidenceBounds(emaValue, stdDev, level, floor);
      return { level, lower, upper };
    });

    predictions.push({
      date: dates[i],
      predicted: emaValue,
      bounds,
    });
  }

  return { predictions, emaValue };
}
