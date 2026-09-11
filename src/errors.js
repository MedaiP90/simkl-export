/** Base error for failures the user can act on. Carries a `hint` with the next step. */
export class AppError extends Error {
  constructor(message, hint) {
    super(message);
    this.name = this.constructor.name;
    this.hint = hint;
  }
}

/** Missing or invalid `.env` configuration. */
export class ConfigError extends AppError {}

/** No access token, or the token was rejected by Simkl. */
export class AuthError extends AppError {}

/** Any other error returned by the Simkl API. */
export class ApiError extends AppError {
  constructor(message, hint, status, code) {
    super(message, hint);
    this.status = status;
    this.code = code;
  }
}
