import { describe, it, expect } from 'vitest';
import { zScore, maConfidenceBounds, regressionPredictionBounds } from '../stats/confidence.js';

describe('confidence intervals', () => {
  describe('zScore', () => {
    it('returns 1.282 for 80% confidence', () => {
      expect(zScore(0.80)).toBeCloseTo(1.282, 2);
    });

    it('returns 1.645 for 90% confidence', () => {
      expect(zScore(0.90)).toBeCloseTo(1.645, 2);
    });

    it('returns 1.960 for 95% confidence', () => {
      expect(zScore(0.95)).toBeCloseTo(1.960, 2);
    });

    it('returns 2.576 for 99% confidence', () => {
      expect(zScore(0.99)).toBeCloseTo(2.576, 2);
    });

    it('approximates for non-standard levels', () => {
      const z = zScore(0.85);
      expect(z).toBeGreaterThan(1.282); // > 80%
      expect(z).toBeLessThan(1.645);    // < 90%
    });
  });

  describe('maConfidenceBounds', () => {
    it('computes symmetric bounds at 95%', () => {
      const { lower, upper } = maConfidenceBounds(100, 10, 0.95);
      expect(lower).toBeCloseTo(80.4, 0);
      expect(upper).toBeCloseTo(119.6, 0);
    });

    it('enforces floor on lower bound', () => {
      const { lower, upper } = maConfidenceBounds(5, 10, 0.95, 0);
      expect(lower).toBe(0);
      expect(upper).toBeCloseTo(24.6, 0);
    });

    it('uses custom floor', () => {
      const { lower } = maConfidenceBounds(50, 30, 0.95, 10);
      expect(lower).toBeGreaterThanOrEqual(10);
    });

    it('produces wider bounds at higher confidence', () => {
      const b80 = maConfidenceBounds(100, 10, 0.80);
      const b95 = maConfidenceBounds(100, 10, 0.95);
      expect(b95.upper - b95.lower).toBeGreaterThan(b80.upper - b80.lower);
    });

    it('produces zero-width bounds when stdDev is 0', () => {
      const { lower, upper } = maConfidenceBounds(100, 0, 0.95);
      expect(lower).toBe(100);
      expect(upper).toBe(100);
    });
  });

  describe('regressionPredictionBounds', () => {
    it('produces bounds that widen with forecast distance', () => {
      const meanX = 5;
      const ssX = 100;
      const ser = 10;
      const n = 20;

      const near = regressionPredictionBounds(100, ser, n, meanX, ssX, 11, 0.95);
      const far = regressionPredictionBounds(100, ser, n, meanX, ssX, 20, 0.95);

      const nearWidth = near.upper - near.lower;
      const farWidth = far.upper - far.lower;
      expect(farWidth).toBeGreaterThan(nearWidth);
    });

    it('enforces floor on lower bound', () => {
      const { lower } = regressionPredictionBounds(5, 20, 10, 5, 100, 11, 0.95, 0);
      expect(lower).toBeGreaterThanOrEqual(0);
    });

    it('produces wider bounds at higher confidence', () => {
      const b80 = regressionPredictionBounds(100, 10, 20, 5, 100, 11, 0.80);
      const b95 = regressionPredictionBounds(100, 10, 20, 5, 100, 11, 0.95);
      expect(b95.upper - b95.lower).toBeGreaterThan(b80.upper - b80.lower);
    });
  });
});
