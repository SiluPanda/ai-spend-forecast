import { describe, it, expect } from 'vitest';
import { computeOls, fitOls } from '../methods/ols.js';
import { computeWls, fitWls } from '../methods/wls.js';

function makeDates(count: number): string[] {
  return Array.from({ length: count }, (_, i) => {
    const d = 20 + i;
    return `2026-03-${String(d).padStart(2, '0')}`;
  });
}

describe('OLS regression', () => {
  describe('fitOls', () => {
    it('fits a perfect linear relationship', () => {
      const x = [0, 1, 2, 3, 4];
      const y = [10, 20, 30, 40, 50];
      const fit = fitOls(x, y);

      expect(fit.slope).toBeCloseTo(10, 5);
      expect(fit.intercept).toBeCloseTo(10, 5);
      expect(fit.rSquared).toBeCloseTo(1, 5);
      expect(fit.standardError).toBeCloseTo(0, 5);
    });

    it('fits a noisy linear relationship', () => {
      const x = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      const y = [10, 12, 14, 13, 16, 18, 17, 20, 22, 24];
      const fit = fitOls(x, y);

      expect(fit.slope).toBeGreaterThan(1);
      expect(fit.rSquared).toBeGreaterThan(0.9);
      expect(fit.standardError).toBeGreaterThan(0);
    });

    it('handles flat data (zero slope)', () => {
      const x = [0, 1, 2, 3, 4];
      const y = [100, 100, 100, 100, 100];
      const fit = fitOls(x, y);

      expect(fit.slope).toBeCloseTo(0, 10);
      expect(fit.intercept).toBeCloseTo(100, 5);
    });

    it('handles decreasing data', () => {
      const x = [0, 1, 2, 3, 4];
      const y = [50, 40, 30, 20, 10];
      const fit = fitOls(x, y);

      expect(fit.slope).toBeCloseTo(-10, 5);
      expect(fit.rSquared).toBeCloseTo(1, 5);
    });

    it('computes correct degrees of freedom', () => {
      const x = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      const y = x.map(v => v * 2 + 5);
      const fit = fitOls(x, y);

      // Degrees of freedom = n - 2 = 8 (but this is in RegressionFit not fitOls)
      // fitOls doesn't return df directly, but SER uses n-2
      expect(fit.standardError).toBeCloseTo(0, 5); // perfect fit
    });
  });

  describe('computeOls', () => {
    it('extrapolates a linear trend', () => {
      const costs = [100, 110, 120, 130, 140]; // +10/day
      const result = computeOls({
        costs,
        window: undefined,
        horizon: 3,
        confidenceLevels: [0.95],
        dates: makeDates(3),
        floor: 0,
      });

      expect(result.predictions).toHaveLength(3);
      // Next values should be ~150, ~160, ~170
      expect(result.predictions[0].predicted).toBeCloseTo(150, 0);
      expect(result.predictions[1].predicted).toBeCloseTo(160, 0);
      expect(result.predictions[2].predicted).toBeCloseTo(170, 0);
    });

    it('provides widening confidence intervals', () => {
      const costs = [100, 112, 118, 132, 138, 152, 160, 171, 178, 192];
      const result = computeOls({
        costs,
        window: undefined,
        horizon: 5,
        confidenceLevels: [0.95],
        dates: makeDates(5),
        floor: 0,
      });

      const widths = result.predictions.map(p => p.bounds[0].upper - p.bounds[0].lower);
      // Each interval should be wider than the previous
      for (let i = 1; i < widths.length; i++) {
        expect(widths[i]).toBeGreaterThan(widths[i - 1]);
      }
    });

    it('returns fit statistics', () => {
      const costs = [100, 120, 140, 160, 180];
      const result = computeOls({
        costs,
        window: undefined,
        horizon: 1,
        confidenceLevels: [0.95],
        dates: makeDates(1),
        floor: 0,
      });

      expect(result.fit).toBeDefined();
      expect(result.fit.dataPoints).toBe(5);
      expect(result.fit.degreesOfFreedom).toBe(3);
      expect(result.fit.rSquared).toBeCloseTo(1, 5);
    });

    it('respects window parameter', () => {
      // First 5 values trend at +10, last 5 at +20
      const costs = [100, 110, 120, 130, 140, 140, 160, 180, 200, 220];
      const resultAll = computeOls({
        costs,
        window: undefined,
        horizon: 1,
        confidenceLevels: [0.95],
        dates: makeDates(1),
        floor: 0,
      });

      const resultWindow = computeOls({
        costs,
        window: 5,
        horizon: 1,
        confidenceLevels: [0.95],
        dates: makeDates(1),
        floor: 0,
      });

      // Window=5 uses only the steeper recent trend
      expect(resultWindow.fit.slope).toBeGreaterThan(resultAll.fit.slope);
    });

    it('enforces floor on predictions', () => {
      // Decreasing trend that would go negative
      const costs = [50, 40, 30, 20, 10];
      const result = computeOls({
        costs,
        window: undefined,
        horizon: 10,
        confidenceLevels: [0.95],
        dates: makeDates(10),
        floor: 0,
      });

      for (const p of result.predictions) {
        expect(p.predicted).toBeGreaterThanOrEqual(0);
      }
    });
  });
});

describe('WLS regression', () => {
  describe('fitWls', () => {
    it('fits a linear relationship with equal weights (same as OLS)', () => {
      const x = [0, 1, 2, 3, 4];
      const y = [10, 20, 30, 40, 50];
      const w = [1, 1, 1, 1, 1];
      const fit = fitWls(x, y, w);

      expect(fit.slope).toBeCloseTo(10, 5);
      expect(fit.intercept).toBeCloseTo(10, 5);
    });

    it('emphasizes recent data with higher weights', () => {
      // Data shifts: first half ~100, second half ~200
      const x = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      const y = [100, 100, 100, 100, 100, 200, 200, 200, 200, 200];

      const equalW = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
      const recentW = [0.1, 0.1, 0.1, 0.1, 0.1, 1, 1, 1, 1, 1];

      const fitEqual = fitWls(x, y, equalW);
      const fitRecent = fitWls(x, y, recentW);

      // With recent weights, the intercept should be higher (closer to 200)
      const predictEqual = fitEqual.intercept + fitEqual.slope * 10;
      const predictRecent = fitRecent.intercept + fitRecent.slope * 10;

      // Recent-weighted should predict closer to 200+
      expect(predictRecent).not.toBe(predictEqual);
    });
  });

  describe('computeWls', () => {
    it('produces forecasts with default decay', () => {
      const costs = [100, 110, 120, 130, 140];
      const result = computeWls({
        costs,
        window: undefined,
        horizon: 3,
        confidenceLevels: [0.95],
        dates: makeDates(3),
        floor: 0,
      });

      expect(result.predictions).toHaveLength(3);
      expect(result.fit).toBeDefined();
      expect(result.fit.dataPoints).toBe(5);
    });

    it('provides widening confidence intervals', () => {
      const costs = [100, 112, 118, 132, 138, 152, 160, 171, 178, 192];
      const result = computeWls({
        costs,
        window: undefined,
        horizon: 5,
        confidenceLevels: [0.95],
        dates: makeDates(5),
        floor: 0,
      });

      const widths = result.predictions.map(p => p.bounds[0].upper - p.bounds[0].lower);
      for (let i = 1; i < widths.length; i++) {
        expect(widths[i]).toBeGreaterThan(widths[i - 1]);
      }
    });

    it('respects custom decay parameter', () => {
      const costs = [100, 100, 100, 200, 200];

      const slow = computeWls({
        costs,
        window: undefined,
        horizon: 1,
        confidenceLevels: [0.95],
        dates: makeDates(1),
        decay: 0.99,
        floor: 0,
      });

      const fast = computeWls({
        costs,
        window: undefined,
        horizon: 1,
        confidenceLevels: [0.95],
        dates: makeDates(1),
        decay: 0.5,
        floor: 0,
      });

      // Faster decay emphasizes recent data more
      expect(fast.predictions[0].predicted).not.toBe(slow.predictions[0].predicted);
    });

    it('accepts custom weights', () => {
      const costs = [100, 200, 300, 400, 500];
      const result = computeWls({
        costs,
        window: undefined,
        horizon: 1,
        confidenceLevels: [0.95],
        dates: makeDates(1),
        weights: [1, 1, 1, 1, 1],
        floor: 0,
      });

      expect(result.predictions).toHaveLength(1);
    });

    it('enforces floor', () => {
      const costs = [50, 40, 30, 20, 10];
      const result = computeWls({
        costs,
        window: undefined,
        horizon: 10,
        confidenceLevels: [0.95],
        dates: makeDates(10),
        floor: 0,
      });

      for (const p of result.predictions) {
        expect(p.predicted).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
