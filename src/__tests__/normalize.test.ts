import { describe, it, expect } from 'vitest';
import { normalizeHistory, extractCosts, getNextDates, formatDateOnly } from '../normalize.js';
import { ForecastError } from '../errors.js';

describe('normalizeHistory', () => {
  it('normalizes tuple input', () => {
    const result = normalizeHistory([
      ['2026-03-01', 100],
      ['2026-03-02', 150],
    ]);
    expect(result).toHaveLength(2);
    expect(result[0].date).toBe('2026-03-01');
    expect(result[0].cost).toBe(100);
    expect(result[1].cost).toBe(150);
  });

  it('normalizes object array input', () => {
    const result = normalizeHistory([
      { date: '2026-03-01', cost: 100 },
      { date: '2026-03-02', cost: 200 },
    ]);
    expect(result).toHaveLength(2);
    expect(result[0].cost).toBe(100);
  });

  it('normalizes date-cost map input', () => {
    const result = normalizeHistory({
      '2026-03-01': 100,
      '2026-03-02': 200,
    });
    expect(result).toHaveLength(2);
    expect(result[0].date).toBe('2026-03-01');
    expect(result[1].date).toBe('2026-03-02');
  });

  it('throws on empty array', () => {
    expect(() => normalizeHistory([])).toThrow(ForecastError);
  });

  it('throws on empty object', () => {
    expect(() => normalizeHistory({})).toThrow(ForecastError);
  });

  it('throws on missing cost and tokenUsage', () => {
    expect(() => normalizeHistory([
      { date: '2026-03-01' },
    ])).toThrow(ForecastError);
  });

  it('allows tokenUsage without cost', () => {
    const result = normalizeHistory([
      {
        date: '2026-03-01',
        tokenUsage: { provider: 'openai', model: 'gpt-4o', inputTokens: 1000, outputTokens: 500 },
      },
    ]);
    expect(result).toHaveLength(1);
  });

  it('throws on unsorted dates', () => {
    expect(() => normalizeHistory([
      ['2026-03-03', 100],
      ['2026-03-01', 200],
    ])).toThrow(ForecastError);
  });

  it('preserves metadata in object input', () => {
    const result = normalizeHistory([
      { date: '2026-03-01', cost: 100, metadata: { team: 'search' } },
    ]);
    expect(result[0].metadata?.team).toBe('search');
  });

  it('handles sorted date-cost map with non-alphabetical keys', () => {
    const result = normalizeHistory({
      '2026-01-10': 50,
      '2026-01-01': 100,
      '2026-01-05': 75,
    });
    // Keys are sorted alphabetically, which matches chronological for ISO dates
    expect(result[0].date).toBe('2026-01-01');
    expect(result[1].date).toBe('2026-01-05');
    expect(result[2].date).toBe('2026-01-10');
  });
});

describe('extractCosts', () => {
  it('extracts cost values from records', () => {
    const records = [
      { date: '2026-03-01', cost: 100 },
      { date: '2026-03-02', cost: 200 },
    ];
    expect(extractCosts(records)).toEqual([100, 200]);
  });

  it('returns 0 for missing cost', () => {
    const records = [
      { date: '2026-03-01' },
    ];
    expect(extractCosts(records)).toEqual([0]);
  });
});

describe('getNextDates', () => {
  it('generates daily dates', () => {
    const dates = getNextDates('2026-03-01', 3);
    expect(dates).toEqual(['2026-03-02', '2026-03-03', '2026-03-04']);
  });

  it('handles month boundaries', () => {
    const dates = getNextDates('2026-03-30', 3);
    expect(dates).toEqual(['2026-03-31', '2026-04-01', '2026-04-02']);
  });

  it('handles year boundaries', () => {
    const dates = getNextDates('2026-12-30', 3);
    expect(dates).toEqual(['2026-12-31', '2027-01-01', '2027-01-02']);
  });

  it('generates single date', () => {
    const dates = getNextDates('2026-03-15', 1);
    expect(dates).toEqual(['2026-03-16']);
  });
});

describe('formatDateOnly', () => {
  it('formats date as YYYY-MM-DD', () => {
    const d = new Date(2026, 2, 5); // March 5, 2026
    expect(formatDateOnly(d)).toBe('2026-03-05');
  });

  it('pads month and day', () => {
    const d = new Date(2026, 0, 1); // Jan 1, 2026
    expect(formatDateOnly(d)).toBe('2026-01-01');
  });
});
