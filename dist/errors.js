"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForecastError = void 0;
class ForecastError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.name = 'ForecastError';
        this.code = code;
    }
}
exports.ForecastError = ForecastError;
//# sourceMappingURL=errors.js.map