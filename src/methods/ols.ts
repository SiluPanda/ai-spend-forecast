import type { ConfidenceBound, ForecastPoint, RegressionFit } from '../types.js';
import { mean, sum } from '../stats/descriptive.js';
import { regressionPredictionBounds } from '../stats/confidence.js';

export interface OlsInput {
  costs: number[];
  window: number | undefined;
  horizon: number;
  confidenceLevels: number[];
  dates: string[];
  floor: number;
}

export interface OlsResult {
  predictions: ForecastPoint[];
  fit: RegressionFit;
}

/**
 * Ordinary Least Squares linear regression forecast.
 * Fits y = a + b*x to the data and extrapolates into the future.
 * Prediction intervals widen with forecast distance.
 */
export function computeOls(input: OlsInput): OlsResult {
  const { costs, horizon, confidenceLevels, dates, floor } = input;
  const n = input.window ? Math.min(input.window, costs.length) : costs.length;
  const y = costs.slice(-n);
  const x = Array.from({ length: n }, (_, i) => i);

  const fit = fitOls(x, y);

  const predictions: ForecastPoint[] = [];
  for (let i = 0; i < horizon; i++) {
    const forecastX = n + i;
    const predicted = Math.max(floor, fit.intercept + fit.slope * forecastX);

    const bounds: ConfidenceBound[] = confidenceLevels.map(level => {
      const { lower, upper } = regressionPredictionBounds(
        predicted,
        fit.standardError,
        n,
        fit.meanX,
        fit.ssX,
        forecastX,
        level,
        floor,
      );
      return { level, lower, upper };
    });

    predictions.push({ date: dates[i], predicted, bounds });
  }

  return {
    predictions,
    fit: {
      intercept: fit.intercept,
      slope: fit.slope,
      rSquared: fit.rSquared,
      standardError: fit.standardError,
      slopeStandardError: fit.slopeStandardError,
      dataPoints: n,
      degreesOfFreedom: n - 2,
    },
  };
}

export interface OlsFitResult {
  intercept: number;
  slope: number;
  rSquared: number;
  standardError: number;
  slopeStandardError: number;
  meanX: number;
  ssX: number;
}

/** Fit OLS regression to x, y arrays. */
export function fitOls(x: number[], y: number[]): OlsFitResult {
  const n = x.length;
  const meanX = mean(x);
  const meanY = mean(y);

  let ssX = 0;
  let ssXY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    ssX += dx * dx;
    ssXY += dx * (y[i] - meanY);
  }

  const slope = ssX === 0 ? 0 : ssXY / ssX;
  const intercept = meanY - slope * meanX;

  // Compute R-squared
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const predicted = intercept + slope * x[i];
    ssRes += (y[i] - predicted) ** 2;
    ssTot += (y[i] - meanY) ** 2;
  }

  const rSquared = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  // Standard error of the regression
  const df = n - 2;
  const standardError = df <= 0 ? 0 : Math.sqrt(ssRes / df);

  // Standard error of the slope
  const slopeStandardError = ssX === 0 || df <= 0 ? 0 : standardError / Math.sqrt(ssX);

  return {
    intercept,
    slope,
    rSquared,
    standardError,
    slopeStandardError,
    meanX,
    ssX,
  };
}

/** Sum of array values. Re-export for convenience. */
export { sum, mean };
