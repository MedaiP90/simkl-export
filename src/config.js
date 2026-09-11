import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { AuthError, ConfigError } from './errors.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Absolute path of `.env` at the project root. */
export const ENV_PATH = path.join(projectRoot, '.env');

const packageJson = JSON.parse(
  readFileSync(path.join(projectRoot, 'package.json'), 'utf8'),
);

/** App identity sent to the Simkl API (`app-name` param and `User-Agent` header). */
export const APP_NAME = 'simkl-export';
export const APP_VERSION = packageJson.version;

/** Returns the Simkl client_id, or throws `ConfigError` with setup steps. */
export function getClientId() {
  const value = (process.env.SIMKL_CLIENT_ID ?? '').trim();
  if (!value) {
    throw new ConfigError(
      'SIMKL_CLIENT_ID is not set.',
      [
        '1. Create a free app at https://simkl.com/settings/developer/',
        '2. Copy .env.example to .env in the project folder',
        '3. Paste the client_id after SIMKL_CLIENT_ID=',
      ].join('\n'),
    );
  }
  return value;
}

/** Returns the saved access token, or throws `AuthError` telling the user to log in. */
export function getAccessToken() {
  const value = (process.env.SIMKL_ACCESS_TOKEN ?? '').trim();
  if (!value) {
    throw new AuthError('You are not logged in.', 'Run "simkl-export login" first.');
  }
  return value;
}

/**
 * Sets `key=value` in a `.env` file's content, replacing an existing line for
 * that key or appending a new one. Pure function, no disk access.
 */
export function upsertEnvLine(content, key, value) {
  const line = `${key}=${value}`;
  const keyPattern = new RegExp(`^${key}=.*$`, 'm');

  if (keyPattern.test(content)) {
    return content.replace(keyPattern, line);
  }
  if (content.length === 0) {
    return `${line}\n`;
  }

  const separator = content.endsWith('\n') ? '' : '\n';
  return `${content}${separator}${line}\n`;
}

/** Writes the access token into `.env` and updates the current process's env. */
export function saveAccessToken(token) {
  const current = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, 'utf8') : '';
  const updated = upsertEnvLine(current, 'SIMKL_ACCESS_TOKEN', token);
  writeFileSync(ENV_PATH, updated);
  process.env.SIMKL_ACCESS_TOKEN = token;
}
