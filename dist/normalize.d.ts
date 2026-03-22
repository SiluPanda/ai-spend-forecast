import type { HistoryInput, UsageRecord } from './types.js';
/**
 * Normalize any supported input format into UsageRecord[].
 * Validates sorting, cost presence, and detects granularity.
 */
export declare function normalizeHistory(input: HistoryInput): UsageRecord[];
/** Extract costs from normalized records. Returns cost array. */
export declare function extractCosts(records: UsageRecord[]): number[];
/**
 * Compute the next date(s) after the last record.
 * Detects daily vs hourly from the date format.
 */
export declare function getNextDates(lastDate: string, count: number): string[];
/** Format a Date as YYYY-MM-DD. */
export declare function formatDateOnly(d: Date): string;
//# sourceMappingURL=normalize.d.ts.map