import { describe, it, expect } from 'vitest';
import { ForecastError } from '../errors.js';

describe('ForecastError', () => {
  it('creates error with code and message', () => {
    const err = new ForecastError('INSUFFICIENT_DATA', 'Not enough data');
    expect(err.code).toBe('INSUFFICIENT_DATA');
    expect(err.message).toBe('Not enough data');
    expect(err.name).toBe('ForecastError');
  });

  it('is an instance of Error', () => {
    const err = new ForecastError('INVALID_OPTIONS', 'Bad options');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ForecastError);
  });

  it('supports all error codes', () => {
    const codes = [
      'INSUFFICIENT_DATA',
      'INVALID_HISTORY',
      'INVALID_OPTIONS',
      'INVALID_BUDGET',
      'MISSING_COST',
      'COMPUTATION_ERROR',
    ] as const;

    for (const code of codes) {
      const err = new ForecastError(code, `Test: ${code}`);
      expect(err.code).toBe(code);
    }
  });

  it('has readonly code property', () => {
    const err = new ForecastError('INVALID_HISTORY', 'test');
    expect(err.code).toBe('INVALID_HISTORY');
    // TypeScript enforces readonly at compile time
  });
});
