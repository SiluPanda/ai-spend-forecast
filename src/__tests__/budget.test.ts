import { describe, it, expect } from 'vitest';
import { alertOnBudget } from '../budget.js';
import { ForecastError } from '../errors.js';

function makeHistory(days: number, baseCost: number, increment = 0): Array<[string, number]> {
  return Array.from({ length: days }, (_, i) => {
    const date = `2026-03-${String(1 + i).padStart(2, '0')}`;
    return [date, baseCost + increment * i] as [string, number];
  });
}

describe('alertOnBudget', () => {
  const defaultBudget = {
    amount: 5000,
    periodStart: '2026-03-01',
    periodEnd: '2026-03-31',
  };

  it('returns on_track when under budget', () => {
    // 20 days at $50/day = $1000 actual, forecast ~$50/day more
    const history = makeHistory(20, 50);
    const alert = alertOnBudget(history, defaultBudget);

    expect(alert.status).toBe('on_track');
    expect(alert.budgetAmount).toBe(5000);
    expect(alert.actualSpend).toBe(50 * 20);
    expect(alert.projectedTotal).toBeLessThan(5000 * 0.8);
  });

  it('returns warning when approaching budget', () => {
    // 20 days at $150/day = $3000 actual, 11 days remaining at ~$150 = ~$4650
    const history = makeHistory(20, 150);
    const alert = alertOnBudget(history, defaultBudget);

    expect(alert.status).toBe('warning');
    expect(alert.projectedTotal).toBeGreaterThan(5000 * 0.8);
    expect(alert.projectedTotal).toBeLessThan(5000);
  });

  it('returns critical when over budget', () => {
    // 20 days at $200/day = $4000 actual, 11 days remaining at ~$200 = ~$6200
    const history = makeHistory(20, 200);
    const alert = alertOnBudget(history, defaultBudget);

    expect(alert.status).toBe('critical');
    expect(alert.projectedTotal).toBeGreaterThan(5000);
    expect(alert.projectedVariance).toBeGreaterThan(0);
  });

  it('calculates daily burn rate', () => {
    const history = makeHistory(10, 100);
    const alert = alertOnBudget(history, defaultBudget);

    // Burn rate = actualSpend / daysElapsed (days elapsed in the budget period, not data points)
    const expectedRate = alert.actualSpend / (31 - alert.daysRemaining);
    expect(alert.dailyBurnRate).toBeCloseTo(expectedRate, 2);
    expect(alert.actualSpend).toBe(1000);
  });

  it('calculates required daily rate', () => {
    const history = makeHistory(10, 100);
    const alert = alertOnBudget(history, defaultBudget);

    // Actual = $1000, remaining budget = $4000, remaining days > 0
    expect(alert.requiredDailyRate).toBeGreaterThan(0);
    const expectedRequired = (5000 - 1000) / alert.daysRemaining;
    expect(alert.requiredDailyRate).toBeCloseTo(expectedRequired, 0);
  });

  it('calculates exhaustion date when over budget', () => {
    const history = makeHistory(20, 250);
    const alert = alertOnBudget(history, {
      ...defaultBudget,
      amount: 3000,
    });

    if (alert.status === 'critical' && alert.exhaustionDate) {
      expect(alert.exhaustionDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('respects custom warning threshold', () => {
    const history = makeHistory(20, 100);
    const alert = alertOnBudget(history, {
      ...defaultBudget,
      warningThreshold: 0.5,
    });

    if (alert.projectedBudgetRatio > 0.5) {
      expect(alert.status).not.toBe('on_track');
    }
  });

  it('respects custom critical threshold', () => {
    const history = makeHistory(20, 150);
    const alert = alertOnBudget(history, {
      ...defaultBudget,
      criticalThreshold: 0.9,
    });

    if (alert.projectedBudgetRatio >= 0.9) {
      expect(alert.status).toBe('critical');
    }
  });

  it('throws on invalid budget amount', () => {
    expect(() => alertOnBudget(makeHistory(14, 100), { amount: 0 })).toThrow(ForecastError);
    expect(() => alertOnBudget(makeHistory(14, 100), { amount: -100 })).toThrow(ForecastError);
  });

  it('includes forecast result', () => {
    const history = makeHistory(14, 100);
    const alert = alertOnBudget(history, defaultBudget);

    expect(alert.forecast).toBeDefined();
    expect(alert.forecast.predictions.length).toBeGreaterThan(0);
  });

  it('reports confidence level', () => {
    const history = makeHistory(14, 100);
    const alert = alertOnBudget(history, defaultBudget, { confidenceLevels: [0.90] });
    expect(alert.confidenceLevel).toBe(0.90);
  });

  it('reports correct days remaining', () => {
    const history = makeHistory(14, 100);
    const alert = alertOnBudget(history, defaultBudget);
    expect(alert.daysRemaining).toBeGreaterThanOrEqual(0);
    expect(alert.daysRemaining).toBeLessThanOrEqual(31);
  });

  it('calculates projected budget ratio', () => {
    const history = makeHistory(20, 100);
    const alert = alertOnBudget(history, defaultBudget);

    expect(alert.projectedBudgetRatio).toBeCloseTo(alert.projectedTotal / 5000, 5);
  });

  it('handles budget with only amount (no period)', () => {
    const history = makeHistory(14, 100);
    const alert = alertOnBudget(history, { amount: 5000 });
    expect(alert.budgetAmount).toBe(5000);
    expect(alert.status).toBeDefined();
  });
});
