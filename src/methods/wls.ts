import type { ConfidenceBound, ForecastPoint, RegressionFit } from '../types.js';
import { regressionPredictionBounds } from '../stats/confidence.js';

export interface WlsInput {
  costs: number[];
  window: number | undefined;
  horizon: number;
  confidenceLevels: number[];
  dates: string[];
  weights?: number[];
  decay?: number;
  floor: number;
}

export interface WlsResult {
  predictions: ForecastPoint[];
  fit: RegressionFit;
}

/**
 * Weighted Least Squares linear regression forecast.
 * Fits y = a + b*x with weights that can emphasize recent data.
 * Default: exponentially decaying weights (decay^(n-1-i)).
 */
export function computeWls(input: WlsInput): WlsResult {
  const { costs, horizon, confidenceLevels, dates, floor } = input;
  const decay = input.decay ?? 0.95;
  const n = input.window ? Math.min(input.window, costs.length) : costs.length;
  const y = costs.slice(-n);
  const x = Array.from({ length: n }, (_, i) => i);

  // Generate weights: exponentially decaying by default
  const w = input.weights ?? Array.from({ length: n }, (_, i) => Math.pow(decay, n - 1 - i));

  const fit = fitWls(x, y, w);

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

export interface WlsFitResult {
  intercept: number;
  slope: number;
  rSquared: number;
  standardError: number;
  slopeStandardError: number;
  meanX: number;
  ssX: number;
}

/** Fit Weighted Least Squares regression. */
export function fitWls(x: number[], y: number[], w: number[]): WlsFitResult {
  const n = x.length;

  // Weighted sums
  let sumW = 0;
  let sumWx = 0;
  let sumWy = 0;
  let sumWxy = 0;
  let sumWx2 = 0;

  for (let i = 0; i < n; i++) {
    sumW += w[i];
    sumWx += w[i] * x[i];
    sumWy += w[i] * y[i];
    sumWxy += w[i] * x[i] * y[i];
    sumWx2 += w[i] * x[i] * x[i];
  }

  const denom = sumW * sumWx2 - sumWx * sumWx;
  const slope = denom === 0 ? 0 : (sumW * sumWxy - sumWx * sumWy) / denom;
  const intercept = sumW === 0 ? 0 : (sumWy - slope * sumWx) / sumW;

  const meanX = sumW === 0 ? 0 : sumWx / sumW;
  const meanY = sumW === 0 ? 0 : sumWy / sumW;

  // Weighted R-squared and standard error
  let ssRes = 0;
  let ssTot = 0;
  let ssX = 0;

  for (let i = 0; i < n; i++) {
    const predicted = intercept + slope * x[i];
    ssRes += w[i] * (y[i] - predicted) ** 2;
    ssTot += w[i] * (y[i] - meanY) ** 2;
    ssX += w[i] * (x[i] - meanX) ** 2;
  }

  const rSquared = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  const df = n - 2;
  const standardError = df <= 0 ? 0 : Math.sqrt(ssRes / df);
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
