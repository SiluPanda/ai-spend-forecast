import { describe, it, expect } from 'vitest';
import { forecast } from '../forecast.js';
import { ForecastError } from '../errors.js';

function makeHistory(days: number, baseCost = 100, increment = 0): Array<[string, number]> {
  return Array.from({ length: days }, (_, i) => {
    const date = `2026-03-${String(1 + i).padStart(2, '0')}`;
    return [date, baseCost + increment * i] as [string, number];
  });
}

describe('forecast', () => {
  describe('input handling', () => {
    it('accepts tuple input', () => {
      const result = forecast(makeHistory(14), { method: 'sma', horizon: 7 });
      expect(result.predictions).toHaveLength(7);
    });

    it('accepts object input', () => {
      const history = makeHistory(14).map(([date, cost]) => ({ date, cost }));
      const result = forecast(history, { method: 'sma', horizon: 7 });
      expect(result.predictions).toHaveLength(7);
    });

    it('accepts map input', () => {
      const map: Record<string, number> = {};
      for (let i = 1; i <= 14; i++) {
        map[`2026-03-${String(i).padStart(2, '0')}`] = 100 + i;
      }
      const result = forecast(map, { method: 'sma', horizon: 7 });
      expect(result.predictions).toHaveLength(7);
    });

    it('throws on empty input', () => {
      expect(() => forecast([])).toThrow(ForecastError);
    });

    it('throws on insufficient data for SMA', () => {
      expect(() => forecast(makeHistory(3), { method: 'sma', window: 7 })).toThrow(ForecastError);
      try {
        forecast(makeHistory(3), { method: 'sma', window: 7 });
      } catch (e) {
        expect((e as ForecastError).code).toBe('INSUFFICIENT_DATA');
      }
    });

    it('throws on insufficient data for regression', () => {
      expect(() => forecast(makeHistory(2), { method: 'ols' })).toThrow(ForecastError);
      try {
        forecast(makeHistory(2), { method: 'ols' });
      } catch (e) {
        expect((e as ForecastError).code).toBe('INSUFFICIENT_DATA');
      }
    });

    it('throws on invalid horizon', () => {
      expect(() => forecast(makeHistory(14), { horizon: 0 })).toThrow(ForecastError);
      try {
        forecast(makeHistory(14), { horizon: 0 });
      } catch (e) {
        expect((e as ForecastError).code).toBe('INVALID_OPTIONS');
      }
    });

    it('throws on invalid confidence level', () => {
      expect(() => forecast(makeHistory(14), { confidenceLevels: [1.5] })).toThrow(ForecastError);
      try {
        forecast(makeHistory(14), { confidenceLevels: [1.5] });
      } catch (e) {
        expect((e as ForecastError).code).toBe('INVALID_OPTIONS');
      }
    });

    it('throws on confidence level of 0', () => {
      expect(() => forecast(makeHistory(14), { confidenceLevels: [0] })).toThrow(ForecastError);
      try {
        forecast(makeHistory(14), { confidenceLevels: [0] });
      } catch (e) {
        expect((e as ForecastError).code).toBe('INVALID_OPTIONS');
      }
    });
  });

  describe('defaults', () => {
    it('defaults to EMA method', () => {
      const result = forecast(makeHistory(14));
      expect(result.method).toBe('ema');
    });

    it('defaults to horizon 14', () => {
      const result = forecast(makeHistory(14));
      expect(result.horizon).toBe(14);
    });

    it('defaults to window 7 for MA methods', () => {
      const result = forecast(makeHistory(14), { method: 'sma' });
      expect(result.window).toBe(7);
    });

    it('defaults confidence levels to [0.80, 0.95]', () => {
      const result = forecast(makeHistory(14));
      const levels = result.predictions[0].bounds.map(b => b.level);
      expect(levels).toEqual([0.80, 0.95]);
    });
  });

  describe('SMA method', () => {
    it('produces flat-line forecast', () => {
      const result = forecast(makeHistory(14, 100, 0), { method: 'sma', horizon: 5 });
      const values = result.predictions.map(p => p.predicted);
      // All values should be the same
      expect(new Set(values).size).toBe(1);
    });

    it('forecast value is mean of window', () => {
      const history = makeHistory(14, 100, 0);
      const result = forecast(history, { method: 'sma', window: 7, horizon: 1 });
      expect(result.predictions[0].predicted).toBeCloseTo(100, 0);
    });
  });

  describe('EMA method', () => {
    it('produces flat-line forecast', () => {
      const result = forecast(makeHistory(14, 100, 5), { method: 'ema', horizon: 3 });
      const values = result.predictions.map(p => p.predicted);
      expect(new Set(values).size).toBe(1);
    });

    it('responds to recent data', () => {
      // Stable then spike
      const history: Array<[string, number]> = [];
      for (let i = 0; i < 13; i++) {
        history.push([`2026-03-${String(i + 1).padStart(2, '0')}`, 100]);
      }
      history.push(['2026-03-14', 200]);

      const result = forecast(history, { method: 'ema', horizon: 1 });
      expect(result.predictions[0].predicted).toBeGreaterThan(100);
    });
  });

  describe('WMA method', () => {
    it('weights recent values more heavily', () => {
      const history = makeHistory(14, 100, 10); // increasing trend
      const smaResult = forecast(history, { method: 'sma', horizon: 1 });
      const wmaResult = forecast(history, { method: 'wma', horizon: 1 });

      // WMA should be higher for increasing data
      expect(wmaResult.predictions[0].predicted).toBeGreaterThan(smaResult.predictions[0].predicted);
    });
  });

  describe('OLS method', () => {
    it('extrapolates linear trend', () => {
      const history = makeHistory(14, 100, 10); // 100, 110, 120, ..., 230
      const result = forecast(history, { method: 'ols', horizon: 3 });

      // Next values should continue the trend
      expect(result.predictions[0].predicted).toBeCloseTo(240, 0);
      expect(result.predictions[1].predicted).toBeCloseTo(250, 0);
    });

    it('includes fit statistics', () => {
      const result = forecast(makeHistory(14, 100, 10), { method: 'ols', horizon: 1 });
      expect(result.fit).toBeDefined();
      expect(result.fit!.rSquared).toBeCloseTo(1, 5);
      expect(result.fit!.slope).toBeCloseTo(10, 5);
    });
  });

  describe('WLS method', () => {
    it('produces forecasts', () => {
      const result = forecast(makeHistory(14, 100, 5), { method: 'wls', horizon: 5 });
      expect(result.predictions).toHaveLength(5);
      expect(result.fit).toBeDefined();
    });

    it('respects decay parameter', () => {
      const history = makeHistory(14, 100, 5);
      const r1 = forecast(history, { method: 'wls', horizon: 1, decay: 0.5 });
      const r2 = forecast(history, { method: 'wls', horizon: 1, decay: 0.99 });
      // Different decay values should produce different predictions
      expect(r1.predictions[0].predicted).not.toEqual(r2.predictions[0].predicted);
    });
  });

  describe('result structure', () => {
    it('includes all expected fields', () => {
      const result = forecast(makeHistory(14), { method: 'ema', horizon: 7 });

      expect(result.method).toBe('ema');
      expect(result.horizon).toBe(7);
      expect(result.window).toBeGreaterThan(0);
      expect(result.predictions).toHaveLength(7);
      expect(result.history).toHaveLength(14);
      expect(result.summary).toBeDefined();
    });

    it('predictions have correct dates', () => {
      const history = makeHistory(14);
      const result = forecast(history, { method: 'sma', horizon: 3 });

      expect(result.predictions[0].date).toBe('2026-03-15');
      expect(result.predictions[1].date).toBe('2026-03-16');
      expect(result.predictions[2].date).toBe('2026-03-17');
    });

    it('summary has correct totals', () => {
      const result = forecast(makeHistory(14, 100, 0), { method: 'sma', horizon: 7 });

      expect(result.summary.totalPredicted).toBeCloseTo(result.summary.averagePredicted * 7, 1);
      expect(result.summary.minPredicted).toBeLessThanOrEqual(result.summary.maxPredicted);
      expect(result.summary.totalLowerBound).toBeLessThanOrEqual(result.summary.totalPredicted);
      expect(result.summary.totalUpperBound).toBeGreaterThanOrEqual(result.summary.totalPredicted);
    });

    it('bounds are nested by confidence level', () => {
      // Use noisy data so EMA has non-zero residual variance
      const noisy = [100, 112, 95, 130, 108, 125, 97, 140, 115, 128, 102, 135, 110, 120];
      const history: Array<[string, number]> = noisy.map((cost, i) => [
        `2026-03-${String(1 + i).padStart(2, '0')}`, cost,
      ]);
      const result = forecast(history, { confidenceLevels: [0.80, 0.95] });
      const bounds = result.predictions[0].bounds;

      expect(bounds).toHaveLength(2);
      const b80 = bounds.find(b => b.level === 0.80)!;
      const b95 = bounds.find(b => b.level === 0.95)!;

      // 95% bounds should be wider than 80%
      expect(b95.upper - b95.lower).toBeGreaterThan(b80.upper - b80.lower);
    });
  });

  describe('edge cases', () => {
    it('handles minimal data (3 records) for regression', () => {
      const result = forecast(makeHistory(3, 100, 10), { method: 'ols', horizon: 1 });
      expect(result.predictions).toHaveLength(1);
      expect(result.predictions[0].predicted).toBeCloseTo(130, 0);
    });

    it('handles single confidence level', () => {
      const result = forecast(makeHistory(14), { confidenceLevels: [0.90] });
      expect(result.predictions[0].bounds).toHaveLength(1);
      expect(result.predictions[0].bounds[0].level).toBe(0.90);
    });

    it('handles constant values', () => {
      const result = forecast(makeHistory(14, 50, 0), { method: 'sma', horizon: 5 });
      expect(result.predictions[0].predicted).toBeCloseTo(50, 0);
    });

    it('handles large horizon', () => {
      const result = forecast(makeHistory(14), { horizon: 365 });
      expect(result.predictions).toHaveLength(365);
    });

    it('clamps window to data length for MA', () => {
      // Window 7 but only 7 data points (need at least window)
      const result = forecast(makeHistory(7, 100, 0), { method: 'sma', window: 7, horizon: 1 });
      expect(result.predictions).toHaveLength(1);
    });
  });
});
