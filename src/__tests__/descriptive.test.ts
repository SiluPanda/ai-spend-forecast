import { describe, it, expect } from 'vitest';
import { mean, sum, variance, standardDeviation, covariance, weightedMean } from '../stats/descriptive.js';

describe('descriptive statistics', () => {
  describe('sum', () => {
    it('sums an array of numbers', () => {
      expect(sum([1, 2, 3, 4, 5])).toBe(15);
    });

    it('returns 0 for empty array', () => {
      expect(sum([])).toBe(0);
    });

    it('handles single element', () => {
      expect(sum([42])).toBe(42);
    });

    it('handles negative numbers', () => {
      expect(sum([-1, -2, 3])).toBe(0);
    });
  });

  describe('mean', () => {
    it('computes arithmetic mean', () => {
      expect(mean([2, 4, 6])).toBe(4);
    });

    it('returns 0 for empty array', () => {
      expect(mean([])).toBe(0);
    });

    it('handles single element', () => {
      expect(mean([10])).toBe(10);
    });

    it('handles decimal values', () => {
      expect(mean([1.5, 2.5, 3.0])).toBeCloseTo(2.333, 2);
    });
  });

  describe('variance', () => {
    it('computes population variance', () => {
      expect(variance([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(4, 5);
    });

    it('computes sample variance', () => {
      expect(variance([2, 4, 4, 4, 5, 5, 7, 9], false)).toBeCloseTo(4.571, 2);
    });

    it('returns 0 for single element', () => {
      expect(variance([5])).toBe(0);
    });

    it('returns 0 for empty array', () => {
      expect(variance([])).toBe(0);
    });

    it('returns 0 for identical values', () => {
      expect(variance([3, 3, 3])).toBe(0);
    });
  });

  describe('standardDeviation', () => {
    it('computes population standard deviation', () => {
      expect(standardDeviation([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2, 5);
    });

    it('computes sample standard deviation', () => {
      expect(standardDeviation([2, 4, 4, 4, 5, 5, 7, 9], false)).toBeCloseTo(2.138, 2);
    });

    it('returns 0 for empty array', () => {
      expect(standardDeviation([])).toBe(0);
    });
  });

  describe('covariance', () => {
    it('computes population covariance', () => {
      const x = [1, 2, 3, 4, 5];
      const y = [2, 4, 6, 8, 10];
      expect(covariance(x, y)).toBeCloseTo(4, 5);
    });

    it('computes sample covariance', () => {
      const x = [1, 2, 3, 4, 5];
      const y = [2, 4, 6, 8, 10];
      expect(covariance(x, y, false)).toBeCloseTo(5, 5);
    });

    it('returns 0 for mismatched lengths', () => {
      expect(covariance([1, 2], [1])).toBe(0);
    });

    it('returns 0 for single element arrays', () => {
      expect(covariance([1], [2])).toBe(0);
    });
  });

  describe('weightedMean', () => {
    it('computes weighted mean', () => {
      expect(weightedMean([10, 20, 30], [1, 2, 3])).toBeCloseTo(23.333, 2);
    });

    it('returns 0 for empty arrays', () => {
      expect(weightedMean([], [])).toBe(0);
    });

    it('handles equal weights (same as arithmetic mean)', () => {
      expect(weightedMean([2, 4, 6], [1, 1, 1])).toBe(4);
    });

    it('returns 0 for zero weights', () => {
      expect(weightedMean([10, 20], [0, 0])).toBe(0);
    });

    it('handles single value with weight', () => {
      expect(weightedMean([42], [5])).toBe(42);
    });
  });
});
