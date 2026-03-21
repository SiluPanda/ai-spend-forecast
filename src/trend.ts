import type { HistoryInput, TrendOptions, TrendResult } from './types.js';
import { ForecastError } from './errors.js';
import { normalizeHistory, extractCosts } from './normalize.js';
import { fitOls } from './methods/ols.js';
import { mean } from './stats/descriptive.js';
import { tPValue } from './stats/t-distribution.js';

/**
 * Detect trend in historical spend data.
 * Fits OLS regression and evaluates the slope for statistical significance.
 */
export function detectTrend(
  history: HistoryInput,
  options?: TrendOptions,
): TrendResult {
  const records = normalizeHistory(history);
  const allCosts = extractCosts(records);

  const significanceLevel = options?.significanceLevel ?? 0.05;
  const n = options?.window ? Math.min(options.window, allCosts.length) : allCosts.length;
  const costs = allCosts.slice(-n);

  if (costs.length < 3) {
    throw new ForecastError(
      'INSUFFICIENT_DATA',
      `Trend detection requires at least 3 data points, got ${costs.length}`,
    );
  }

  const x = Array.from({ length: n }, (_, i) => i);
  const fit = fitOls(x, costs);

  // t-test on the slope
  const df = n - 2;

  let tStat: number;
  let pValue: number;

  if (fit.slopeStandardError === 0) {
    // Perfect fit: if slope is non-zero, it is infinitely significant
    if (fit.slope !== 0) {
      tStat = Infinity;
      pValue = 0;
    } else {
      tStat = 0;
      pValue = 1;
    }
  } else {
    tStat = fit.slope / fit.slopeStandardError;
    pValue = tPValue(Math.abs(tStat), df);
  }

  // Determine significance
  const significant = pValue < significanceLevel;

  // Direction
  let direction: 'increasing' | 'decreasing' | 'stable';
  if (!significant) {
    direction = 'stable';
  } else {
    direction = fit.slope > 0 ? 'increasing' : 'decreasing';
  }

  const meanCost = mean(costs);
  const slopePercentPerPeriod = meanCost === 0 ? 0 : (fit.slope / meanCost) * 100;

  return {
    direction,
    slopePerPeriod: fit.slope,
    slopePercentPerPeriod,
    projected30PeriodChange: fit.slope * 30,
    significant,
    pValue,
    rSquared: fit.rSquared,
    dataPoints: n,
  };
}
