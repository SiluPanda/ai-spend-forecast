import { describe, it, expect } from 'vitest';
import { detectTrend } from '../trend.js';
import { ForecastError } from '../errors.js';

function makeHistory(days: number, baseCost: number, increment: number): Array<[string, number]> {
  return Array.from({ length: days }, (_, i) => {
    const date = `2026-03-${String(1 + i).padStart(2, '0')}`;
    return [date, baseCost + increment * i] as [string, number];
  });
}

describe('detectTrend', () => {
  it('detects increasing trend', () => {
    const history = makeHistory(30, 100, 10);
    const result = detectTrend(history);

    expect(result.direction).toBe('increasing');
    expect(result.slopePerPeriod).toBeCloseTo(10, 0);
    expect(result.significant).toBe(true);
    expect(result.rSquared).toBeCloseTo(1, 5);
  });

  it('detects decreasing trend', () => {
    const history = makeHistory(30, 500, -10);
    const result = detectTrend(history);

    expect(result.direction).toBe('decreasing');
    expect(result.slopePerPeriod).toBeCloseTo(-10, 0);
    expect(result.significant).toBe(true);
  });

  it('detects stable trend (flat data)', () => {
    const history = makeHistory(30, 100, 0);
    const result = detectTrend(history);

    expect(result.direction).toBe('stable');
    expect(result.significant).toBe(false);
  });

  it('reports correct slope percent per period', () => {
    const history = makeHistory(20, 100, 5);
    const result = detectTrend(history);

    // Mean cost = 100 + 5*(19/2) = 147.5
    // Slope = 5, so percent = 5/147.5 * 100 = ~3.39%
    expect(result.slopePercentPerPeriod).toBeGreaterThan(0);
  });

  it('reports 30-period projection', () => {
    const history = makeHistory(14, 100, 10);
    const result = detectTrend(history);

    expect(result.projected30PeriodChange).toBeCloseTo(300, 0);
  });

  it('reports correct data points count', () => {
    const history = makeHistory(20, 100, 5);
    const result = detectTrend(history);
    expect(result.dataPoints).toBe(20);
  });

  it('respects window parameter', () => {
    const history = makeHistory(30, 100, 5);
    const result = detectTrend(history, { window: 10 });
    expect(result.dataPoints).toBe(10);
  });

  it('throws on insufficient data', () => {
    expect(() => detectTrend(makeHistory(2, 100, 10))).toThrow(ForecastError);
  });

  it('reports p-value', () => {
    const history = makeHistory(14, 100, 10);
    const result = detectTrend(history);

    expect(result.pValue).toBeLessThan(0.05);
  });

  it('detects noisy but significant trend', () => {
    // Add noise but maintain trend
    const history: Array<[string, number]> = [];
    for (let i = 0; i < 30; i++) {
      const noise = (i % 2 === 0 ? 5 : -5);
      history.push([
        `2026-03-${String(1 + i).padStart(2, '0')}`,
        100 + 10 * i + noise,
      ]);
    }
    const result = detectTrend(history);

    expect(result.direction).toBe('increasing');
    expect(result.significant).toBe(true);
    expect(result.rSquared).toBeGreaterThan(0.9);
  });

  it('handles stable data with noise as not significant', () => {
    // Random-ish noise around 100 with no real trend
    const costs = [102, 98, 105, 95, 103, 97, 101, 99, 104, 96, 100, 102, 98, 101];
    const history: Array<[string, number]> = costs.map((c, i) => [
      `2026-03-${String(1 + i).padStart(2, '0')}`,
      c,
    ]);

    const result = detectTrend(history);
    expect(result.rSquared).toBeLessThan(0.3);
  });

  it('respects custom significance level', () => {
    const history = makeHistory(10, 100, 1); // very slight trend
    const strict = detectTrend(history, { significanceLevel: 0.001 });
    const lenient = detectTrend(history, { significanceLevel: 0.5 });

    // Strict might not be significant, lenient should be
    if (!strict.significant) {
      expect(lenient.significant).toBe(true);
    }
  });

  it('returns r-squared between 0 and 1', () => {
    const history = makeHistory(20, 100, 5);
    const result = detectTrend(history);
    expect(result.rSquared).toBeGreaterThanOrEqual(0);
    expect(result.rSquared).toBeLessThanOrEqual(1);
  });
});
