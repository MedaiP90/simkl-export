import { APP_NAME, APP_VERSION } from './config.js';
import { ApiError, AuthError, ConfigError } from './errors.js';

const API_BASE_URL = 'https://api.simkl.com';
const MAX_RETRIES = 3;
const BACKOFF_SECONDS = [1, 2, 4];

const wait = (seconds) => new Promise((resolve) => setTimeout(resolve, seconds * 1000));

/** Does GET requests to the Simkl API: required params/headers, error mapping, 429/5xx retry. */
export class SimklClient {
  constructor({ clientId, accessToken = null, fetchFn = fetch, delayFn = wait }) {
    this.clientId = clientId;
    this.accessToken = accessToken;
    this.fetchFn = fetchFn;
    this.delayFn = delayFn;
  }

  /** GETs `path` with `query`, returns the parsed JSON body. Retries on 429/5xx. */
  async get(path, query = {}) {
    const url = this.#buildUrl(path, query);
    const headers = this.#buildHeaders();

    for (let attempt = 0; ; attempt += 1) {
      const response = await this.#fetch(url, headers);
      if (response.ok) {
        return response.json();
      }

      const canRetry = this.#isRetryable(response.status) && attempt < MAX_RETRIES;
      if (!canRetry) {
        throw await this.#toError(response, attempt);
      }
      await this.delayFn(this.#retryDelaySeconds(response, attempt));
    }
  }

  #buildUrl(path, query) {
    const url = new URL(path, API_BASE_URL);
    const params = {
      client_id: this.clientId,
      'app-name': APP_NAME,
      'app-version': APP_VERSION,
      ...query,
    };
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    return url;
  }

  #buildHeaders() {
    const headers = {
      'User-Agent': `${APP_NAME}/${APP_VERSION}`,
      Accept: 'application/json',
    };
    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }
    return headers;
  }

  async #fetch(url, headers) {
    try {
      return await this.fetchFn(url, { headers });
    } catch {
      throw new ApiError(
        'Cannot reach api.simkl.com.',
        'Check your internet connection.',
      );
    }
  }

  #isRetryable(status) {
    return status === 429 || status >= 500;
  }

  #retryDelaySeconds(response, attempt) {
    const retryAfter = Number(response.headers.get('Retry-After'));
    return retryAfter > 0 ? retryAfter : BACKOFF_SECONDS[attempt];
  }

  async #toError(response, attempt) {
    const { status } = response;
    if (status === 401) {
      return new AuthError(
        'Simkl rejected your access token.',
        'Run "simkl-export login" again.',
      );
    }
    if (status === 412) {
      return new ConfigError(
        'Simkl rejected your client_id.',
        'Check SIMKL_CLIENT_ID in .env. Copy it again from https://simkl.com/settings/developer/',
      );
    }

    const wasRetried = attempt >= MAX_RETRIES;
    if (status === 429 && wasRetried) {
      return new ApiError(
        'Simkl rate limit reached.',
        'Wait a minute and run the command again.',
        status,
      );
    }
    if (status >= 500 && wasRetried) {
      return new ApiError(
        `Simkl is not available right now (HTTP ${status}).`,
        'Try again later. Status: https://api.simkl.org/support',
        status,
      );
    }

    const body = await response.json().catch(() => ({}));
    return new ApiError(
      body.message ?? body.error ?? `Simkl returned an unexpected error (HTTP ${status}).`,
      undefined,
      status,
      body.error,
    );
  }
}
