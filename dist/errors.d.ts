export type ForecastErrorCode = 'INSUFFICIENT_DATA' | 'INVALID_HISTORY' | 'INVALID_OPTIONS' | 'INVALID_BUDGET' | 'MISSING_COST' | 'COMPUTATION_ERROR';
export declare class ForecastError extends Error {
    readonly code: ForecastErrorCode;
    constructor(code: ForecastErrorCode, message: string);
}
//# sourceMappingURL=errors.d.ts.map