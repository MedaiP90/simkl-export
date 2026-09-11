import { AuthError } from '../errors.js';

/** Requests a new PIN code. Returns the code and how to poll for its approval. */
export async function requestPin(client) {
  const body = await client.get('/oauth/pin');
  return {
    userCode: body.user_code,
    verificationUri: body.verification_uri,
    expiresIn: body.expires_in,
    interval: body.interval,
  };
}

/**
 * Polls `GET /oauth/pin/{userCode}` every `interval` seconds until the user
 * approves the code. Returns the access token, or throws `AuthError` once
 * `expiresIn` seconds have passed without approval.
 */
export async function pollForToken(client, { userCode, interval, expiresIn }, { sleep }) {
  const maxAttempts = Math.floor(expiresIn / interval);

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await sleep(interval);
    const body = await client.get(`/oauth/pin/${userCode}`);
    if (body.result === 'OK') {
      return body.access_token;
    }
  }

  throw new AuthError(
    'The login code expired.',
    'Run "simkl-export login" again and enter the code within 15 minutes.',
  );
}
