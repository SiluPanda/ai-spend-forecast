/** Compute the arithmetic mean of an array of numbers. */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return sum(values) / values.length;
}

/** Compute the sum of an array of numbers. */
export function sum(values: number[]): number {
  let total = 0;
  for (const v of values) total += v;
  return total;
}

/** Compute the population variance of an array. */
export function variance(values: number[], population = true): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  let ss = 0;
  for (const v of values) ss += (v - m) ** 2;
  return ss / (population ? values.length : values.length - 1);
}

/** Compute the standard deviation. */
export function standardDeviation(values: number[], population = true): number {
  return Math.sqrt(variance(values, population));
}

/** Compute the covariance of two arrays. */
export function covariance(xs: number[], ys: number[], population = true): number {
  if (xs.length !== ys.length || xs.length < 2) return 0;
  const mx = mean(xs);
  const my = mean(ys);
  let cov = 0;
  for (let i = 0; i < xs.length; i++) {
    cov += (xs[i] - mx) * (ys[i] - my);
  }
  return cov / (population ? xs.length : xs.length - 1);
}

/** Compute the weighted mean. */
export function weightedMean(values: number[], weights: number[]): number {
  if (values.length === 0 || values.length !== weights.length) return 0;
  let wSum = 0;
  let vwSum = 0;
  for (let i = 0; i < values.length; i++) {
    vwSum += values[i] * weights[i];
    wSum += weights[i];
  }
  return wSum === 0 ? 0 : vwSum / wSum;
}
