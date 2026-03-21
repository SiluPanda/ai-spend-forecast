import { describe, it, expect } from 'vitest';
import { computeSma } from '../methods/sma.js';
import { computeEma } from '../methods/ema.js';
import { computeWma } from '../methods/wma.js';

function makeDates(count: number): string[] {
  return Array.from({ length: count }, (_, i) => {
    return `2026-03-${String(20 + i).padStart(2, '0')}`;
  });
}

describe('SMA', () => {
  const costs = [100, 110, 120, 130, 140, 150, 160];
  const dates = makeDates(3);

  it('computes flat-line forecast at window mean', () => {
    const predictions = computeSma({
      costs,
      window: 7,
      horizon: 3,
      confidenceLevels: [0.95],
      dates,
      floor: 0,
    });

    expect(predictions).toHaveLength(3);
    // Mean of [100..160] = 130
    expect(predictions[0].predicted).toBeCloseTo(130, 0);
    expect(predictions[1].predicted).toBeCloseTo(130, 0);
    expect(predictions[2].predicted).toBeCloseTo(130, 0);
  });

  it('uses only last window values', () => {
    const predictions = computeSma({
      costs: [50, 60, ...costs], // extra values before window
      window: 3,
      horizon: 2,
      confidenceLevels: [0.95],
      dates: makeDates(2),
      floor: 0,
    });

    // Mean of last 3: [140, 150, 160] = 150
    expect(predictions[0].predicted).toBeCloseTo(150, 0);
  });

  it('produces confidence bounds', () => {
    const predictions = computeSma({
      costs,
      window: 7,
      horizon: 1,
      confidenceLevels: [0.80, 0.95],
      dates: makeDates(1),
      floor: 0,
    });

    expect(predictions[0].bounds).toHaveLength(2);
    const b80 = predictions[0].bounds.find(b => b.level === 0.80)!;
    const b95 = predictions[0].bounds.find(b => b.level === 0.95)!;

    expect(b80.lower).toBeLessThan(predictions[0].predicted);
    expect(b80.upper).toBeGreaterThan(predictions[0].predicted);
    expect(b95.upper - b95.lower).toBeGreaterThan(b80.upper - b80.lower);
  });

  it('enforces floor on predicted value', () => {
    const predictions = computeSma({
      costs: [0, 0, 0],
      window: 3,
      horizon: 1,
      confidenceLevels: [0.95],
      dates: makeDates(1),
      floor: 0,
    });

    expect(predictions[0].predicted).toBeGreaterThanOrEqual(0);
    expect(predictions[0].bounds[0].lower).toBeGreaterThanOrEqual(0);
  });

  it('produces constant-width confidence intervals across horizon', () => {
    const predictions = computeSma({
      costs,
      window: 7,
      horizon: 5,
      confidenceLevels: [0.95],
      dates: makeDates(5),
      floor: 0,
    });

    const widths = predictions.map(p => p.bounds[0].upper - p.bounds[0].lower);
    // All widths should be equal for SMA
    for (let i = 1; i < widths.length; i++) {
      expect(widths[i]).toBeCloseTo(widths[0], 5);
    }
  });
});

describe('EMA', () => {
  const costs = [100, 110, 120, 130, 140, 150, 160];
  const dates = makeDates(3);

  it('computes flat-line forecast at final EMA value', () => {
    const { predictions, emaValue } = computeEma({
      costs,
      window: 7,
      horizon: 3,
      confidenceLevels: [0.95],
      dates,
      floor: 0,
    });

    expect(predictions).toHaveLength(3);
    // All predictions should be the same EMA value
    expect(predictions[0].predicted).toBe(emaValue);
    expect(predictions[1].predicted).toBe(emaValue);
    expect(predictions[2].predicted).toBe(emaValue);
  });

  it('is more responsive to recent data than SMA', () => {
    // Costs with a recent increase
    const trendingCosts = [100, 100, 100, 100, 100, 100, 200];

    const smaResult = computeSma({
      costs: trendingCosts,
      window: 7,
      horizon: 1,
      confidenceLevels: [0.95],
      dates: makeDates(1),
      floor: 0,
    });

    const { predictions: emaResult } = computeEma({
      costs: trendingCosts,
      window: 7,
      horizon: 1,
      confidenceLevels: [0.95],
      dates: makeDates(1),
      floor: 0,
    });

    // EMA should be higher than SMA because it weights recent 200 more
    // SMA = (100*6 + 200) / 7 = 114.28
    // EMA gives more weight to the 200
    expect(emaResult[0].predicted).toBeGreaterThan(smaResult[0].predicted);
  });

  it('respects custom alpha', () => {
    const { emaValue: lowAlpha } = computeEma({
      costs,
      window: 7,
      horizon: 1,
      confidenceLevels: [0.95],
      dates: makeDates(1),
      alpha: 0.1,
      floor: 0,
    });

    const { emaValue: highAlpha } = computeEma({
      costs,
      window: 7,
      horizon: 1,
      confidenceLevels: [0.95],
      dates: makeDates(1),
      alpha: 0.9,
      floor: 0,
    });

    // Higher alpha makes EMA closer to the most recent value (160)
    expect(highAlpha).toBeGreaterThan(lowAlpha);
  });

  it('produces confidence bounds', () => {
    const { predictions } = computeEma({
      costs,
      window: 7,
      horizon: 1,
      confidenceLevels: [0.80, 0.95],
      dates: makeDates(1),
      floor: 0,
    });

    expect(predictions[0].bounds).toHaveLength(2);
  });
});

describe('WMA', () => {
  const costs = [100, 110, 120, 130, 140, 150, 160];

  it('gives more weight to recent values than SMA', () => {
    const smaResult = computeSma({
      costs,
      window: 7,
      horizon: 1,
      confidenceLevels: [0.95],
      dates: makeDates(1),
      floor: 0,
    });

    const wmaResult = computeWma({
      costs,
      window: 7,
      horizon: 1,
      confidenceLevels: [0.95],
      dates: makeDates(1),
      floor: 0,
    });

    // WMA with linearly increasing weights should be > SMA for ascending data
    expect(wmaResult[0].predicted).toBeGreaterThan(smaResult[0].predicted);
  });

  it('accepts custom weights', () => {
    const predictions = computeWma({
      costs: [10, 20, 30],
      window: 3,
      horizon: 1,
      confidenceLevels: [0.95],
      dates: makeDates(1),
      weights: [1, 1, 1], // Equal weights = SMA
      floor: 0,
    });

    expect(predictions[0].predicted).toBeCloseTo(20, 5);
  });

  it('applies day-of-week weights', () => {
    // March 20, 2026 is a Friday (day 5)
    const noDow = computeWma({
      costs,
      window: 7,
      horizon: 1,
      confidenceLevels: [0.95],
      dates: ['2026-03-21'], // Saturday (day 6)
      floor: 0,
    });

    const withDow = computeWma({
      costs,
      window: 7,
      horizon: 1,
      confidenceLevels: [0.95],
      dates: ['2026-03-21'], // Saturday
      dayOfWeekWeights: { 6: 0.5 }, // Saturday at 50%
      floor: 0,
    });

    expect(withDow[0].predicted).toBeCloseTo(noDow[0].predicted * 0.5, 0);
  });

  it('produces confidence bounds', () => {
    const predictions = computeWma({
      costs,
      window: 7,
      horizon: 1,
      confidenceLevels: [0.80, 0.95],
      dates: makeDates(1),
      floor: 0,
    });

    expect(predictions[0].bounds).toHaveLength(2);
  });

  it('enforces floor', () => {
    const predictions = computeWma({
      costs: [0, 0, 0],
      window: 3,
      horizon: 1,
      confidenceLevels: [0.95],
      dates: makeDates(1),
      floor: 0,
    });

    expect(predictions[0].predicted).toBeGreaterThanOrEqual(0);
  });
});
