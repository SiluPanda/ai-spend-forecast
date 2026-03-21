import { describe, it, expect } from 'vitest';
import { createForecaster } from '../forecaster.js';
import { ForecastError } from '../errors.js';

function makeHistory(days: number, baseCost = 100, increment = 0): Array<[string, number]> {
  return Array.from({ length: days }, (_, i) => {
    const date = `2026-03-${String(1 + i).padStart(2, '0')}`;
    return [date, baseCost + increment * i] as [string, number];
  });
}

describe('createForecaster', () => {
  it('creates a forecaster with default options', () => {
    const forecaster = createForecaster({});
    expect(forecaster).toBeDefined();
    expect(forecaster.load).toBeDefined();
    expect(forecaster.append).toBeDefined();
    expect(forecaster.forecast).toBeDefined();
    expect(forecaster.detectTrend).toBeDefined();
    expect(forecaster.checkBudget).toBeDefined();
    expect(forecaster.getHistory).toBeDefined();
    expect(forecaster.reset).toBeDefined();
  });

  describe('load', () => {
    it('loads history data', () => {
      const forecaster = createForecaster({});
      forecaster.load(makeHistory(14));
      expect(forecaster.getHistory()).toHaveLength(14);
    });

    it('replaces previously loaded data', () => {
      const forecaster = createForecaster({});
      forecaster.load(makeHistory(14));
      forecaster.load(makeHistory(7));
      expect(forecaster.getHistory()).toHaveLength(7);
    });
  });

  describe('append', () => {
    it('appends a single record', () => {
      const forecaster = createForecaster({});
      forecaster.load(makeHistory(14));
      forecaster.append({ date: '2026-03-15', cost: 120 });
      expect(forecaster.getHistory()).toHaveLength(15);
    });

    it('appends multiple records', () => {
      const forecaster = createForecaster({});
      forecaster.load(makeHistory(14));
      forecaster.append([
        { date: '2026-03-15', cost: 120 },
        { date: '2026-03-16', cost: 130 },
      ]);
      expect(forecaster.getHistory()).toHaveLength(16);
    });
  });

  describe('forecast', () => {
    it('uses pre-configured options', () => {
      const forecaster = createForecaster({ method: 'sma', horizon: 5 });
      forecaster.load(makeHistory(14));
      const result = forecaster.forecast();

      expect(result.method).toBe('sma');
      expect(result.horizon).toBe(5);
    });

    it('allows overrides', () => {
      const forecaster = createForecaster({ method: 'sma', horizon: 5 });
      forecaster.load(makeHistory(14));
      const result = forecaster.forecast({ horizon: 3 });

      expect(result.horizon).toBe(3);
    });

    it('throws if no history loaded', () => {
      const forecaster = createForecaster({});
      expect(() => forecaster.forecast()).toThrow(ForecastError);
    });
  });

  describe('detectTrend', () => {
    it('detects trend in loaded data', () => {
      const forecaster = createForecaster({});
      forecaster.load(makeHistory(14, 100, 10));
      const trend = forecaster.detectTrend();

      expect(trend.direction).toBe('increasing');
    });

    it('throws if no history loaded', () => {
      const forecaster = createForecaster({});
      expect(() => forecaster.detectTrend()).toThrow(ForecastError);
    });
  });

  describe('checkBudget', () => {
    it('checks budget with pre-configured budget', () => {
      const forecaster = createForecaster({
        budget: {
          amount: 5000,
          periodStart: '2026-03-01',
          periodEnd: '2026-03-31',
        },
      });
      forecaster.load(makeHistory(14, 100));
      const alert = forecaster.checkBudget();

      expect(alert.budgetAmount).toBe(5000);
      expect(alert.status).toBeDefined();
    });

    it('allows budget overrides', () => {
      const forecaster = createForecaster({
        budget: { amount: 5000, periodStart: '2026-03-01', periodEnd: '2026-03-31' },
      });
      forecaster.load(makeHistory(14, 100));
      const alert = forecaster.checkBudget({ amount: 3000 });

      expect(alert.budgetAmount).toBe(3000);
    });

    it('throws if no budget configured and no override', () => {
      const forecaster = createForecaster({});
      forecaster.load(makeHistory(14, 100));
      expect(() => forecaster.checkBudget()).toThrow(ForecastError);
    });

    it('throws if no history loaded', () => {
      const forecaster = createForecaster({
        budget: { amount: 5000 },
      });
      expect(() => forecaster.checkBudget()).toThrow(ForecastError);
    });
  });

  describe('reset', () => {
    it('clears all data', () => {
      const forecaster = createForecaster({});
      forecaster.load(makeHistory(14));
      expect(forecaster.getHistory()).toHaveLength(14);

      forecaster.reset();
      expect(forecaster.getHistory()).toHaveLength(0);
    });
  });

  describe('getHistory', () => {
    it('returns a copy of the history', () => {
      const forecaster = createForecaster({});
      forecaster.load(makeHistory(14));
      const h1 = forecaster.getHistory();
      const h2 = forecaster.getHistory();

      expect(h1).toEqual(h2);
      expect(h1).not.toBe(h2); // Different references
    });
  });

  describe('stateful workflow', () => {
    it('supports load -> forecast -> append -> forecast cycle', () => {
      const forecaster = createForecaster({ method: 'sma', horizon: 3 });
      forecaster.load(makeHistory(14, 100));
      const r1 = forecaster.forecast();
      expect(r1.predictions).toHaveLength(3);

      forecaster.append({ date: '2026-03-15', cost: 200 });
      const r2 = forecaster.forecast();
      expect(r2.predictions).toHaveLength(3);
      expect(r2.history).toHaveLength(15);
    });
  });
});
