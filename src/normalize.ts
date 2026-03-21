import type { HistoryInput, UsageRecord } from './types.js';
import { ForecastError } from './errors.js';

/**
 * Normalize any supported input format into UsageRecord[].
 * Validates sorting, cost presence, and detects granularity.
 */
export function normalizeHistory(input: HistoryInput): UsageRecord[] {
  if (!input || (Array.isArray(input) && input.length === 0)) {
    throw new ForecastError('INVALID_HISTORY', 'History must not be empty');
  }

  let records: UsageRecord[];

  if (Array.isArray(input)) {
    if (input.length === 0) {
      throw new ForecastError('INVALID_HISTORY', 'History must not be empty');
    }

    const first = input[0];
    if (Array.isArray(first)) {
      // SimpleCostHistory: [string, number][]
      records = (input as Array<[string, number]>).map(([date, cost]) => ({
        date,
        cost,
      }));
    } else {
      // ObjectCostHistory: UsageRecord[]
      records = (input as UsageRecord[]).map(r => ({ ...r }));
    }
  } else if (typeof input === 'object' && input !== null) {
    // DateCostMap: Record<string, number>
    const keys = Object.keys(input).sort();
    if (keys.length === 0) {
      throw new ForecastError('INVALID_HISTORY', 'History must not be empty');
    }
    records = keys.map(date => ({
      date,
      cost: (input as Record<string, number>)[date],
    }));
  } else {
    throw new ForecastError('INVALID_HISTORY', 'Unsupported history format');
  }

  // Validate that each record has a cost
  for (const record of records) {
    if (record.cost === undefined && !record.tokenUsage) {
      throw new ForecastError(
        'MISSING_COST',
        `Record with date "${record.date}" has neither cost nor tokenUsage`,
      );
    }
  }

  // Validate chronological sorting
  for (let i = 1; i < records.length; i++) {
    if (records[i].date < records[i - 1].date) {
      throw new ForecastError(
        'INVALID_HISTORY',
        `History is not sorted chronologically: "${records[i - 1].date}" appears before "${records[i].date}"`,
      );
    }
  }

  return records;
}

/** Extract costs from normalized records. Returns cost array. */
export function extractCosts(records: UsageRecord[]): number[] {
  return records.map(r => r.cost ?? 0);
}

/**
 * Compute the next date(s) after the last record.
 * Detects daily vs hourly from the date format.
 */
export function getNextDates(lastDate: string, count: number): string[] {
  const dates: string[] = [];
  const isHourly = lastDate.length > 10; // ISO datetime includes time

  const base = new Date(lastDate);

  for (let i = 1; i <= count; i++) {
    const next = new Date(base);
    if (isHourly) {
      next.setTime(next.getTime() + i * 60 * 60 * 1000);
      dates.push(next.toISOString());
    } else {
      next.setDate(next.getDate() + i);
      dates.push(formatDateOnly(next));
    }
  }

  return dates;
}

/** Format a Date as YYYY-MM-DD. */
export function formatDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
