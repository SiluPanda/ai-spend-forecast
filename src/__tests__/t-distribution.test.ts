import { describe, it, expect } from 'vitest';
import { tCritical, tPValue } from '../stats/t-distribution.js';

describe('t-distribution', () => {
  describe('tCritical', () => {
    it('returns correct value for df=10, 95% confidence', () => {
      // Two-tailed alpha = 0.05, t(10, 0.05) = 2.228
      expect(tCritical(10, 0.95)).toBeCloseTo(2.228, 2);
    });

    it('returns correct value for df=5, 80% confidence', () => {
      // Two-tailed alpha = 0.20, t(5, 0.20) = 1.476
      expect(tCritical(5, 0.80)).toBeCloseTo(1.476, 2);
    });

    it('returns correct value for df=20, 95% confidence', () => {
      expect(tCritical(20, 0.95)).toBeCloseTo(2.086, 2);
    });

    it('returns z-score approximation for large df', () => {
      // For df=9999 (infinity), 95% confidence = 1.96
      expect(tCritical(9999, 0.95)).toBeCloseTo(1.96, 1);
    });

    it('returns correct value for df=1, 95% confidence', () => {
      expect(tCritical(1, 0.95)).toBeCloseTo(12.706, 1);
    });

    it('interpolates between known df values', () => {
      // df=15 is in the table: 2.131 for 95%
      const t15 = tCritical(15, 0.95);
      expect(t15).toBeCloseTo(2.131, 2);

      // df=22 should interpolate between 20 (2.086) and 25 (2.060)
      const t22 = tCritical(22, 0.95);
      expect(t22).toBeGreaterThan(2.060);
      expect(t22).toBeLessThan(2.086);
    });

    it('handles df=2', () => {
      expect(tCritical(2, 0.95)).toBeCloseTo(4.303, 2);
    });

    it('returns higher value for higher confidence', () => {
      const t80 = tCritical(10, 0.80);
      const t95 = tCritical(10, 0.95);
      const t99 = tCritical(10, 0.99);
      expect(t80).toBeLessThan(t95);
      expect(t95).toBeLessThan(t99);
    });
  });

  describe('tPValue', () => {
    it('returns ~1 for t=0', () => {
      const p = tPValue(0, 10);
      expect(p).toBeCloseTo(1, 1);
    });

    it('returns small p for large t-statistic', () => {
      const p = tPValue(5, 10);
      expect(p).toBeLessThan(0.01);
    });

    it('returns ~0.05 for t-critical at 95% with df=10', () => {
      // t-critical for df=10 at alpha=0.05 is 2.228
      const p = tPValue(2.228, 10);
      expect(p).toBeCloseTo(0.05, 1);
    });

    it('returns higher p for smaller t', () => {
      const p1 = tPValue(1.0, 10);
      const p2 = tPValue(3.0, 10);
      expect(p1).toBeGreaterThan(p2);
    });
  });
});
