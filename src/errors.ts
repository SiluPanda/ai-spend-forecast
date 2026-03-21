export type ForecastErrorCode =
  | 'INSUFFICIENT_DATA'
  | 'INVALID_HISTORY'
  | 'INVALID_OPTIONS'
  | 'INVALID_BUDGET'
  | 'MISSING_COST'
  | 'COMPUTATION_ERROR';

export class ForecastError extends Error {
  readonly code: ForecastErrorCode;

  constructor(code: ForecastErrorCode, message: string) {
    super(message);
    this.name = 'ForecastError';
    this.code = code;
  }
}
