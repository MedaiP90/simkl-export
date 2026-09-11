import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pollForToken } from '../src/auth/pinLogin.js';
import { AuthError } from '../src/errors.js';

function fakeClient(...responses) {
  const calls = [];
  return {
    calls,
    async get(path) {
      calls.push(path);
      return responses[calls.length - 1];
    },
  };
}

function fakeSleep() {
  const calls = [];
  const sleep = async (seconds) => {
    calls.push(seconds);
  };
  sleep.calls = calls;
  return sleep;
}

test('returns the token after two KO responses and one OK, no calls after that', async () => {
  const client = fakeClient(
    { result: 'KO' },
    { result: 'KO' },
    { result: 'OK', access_token: 'tok123' },
  );
  const sleep = fakeSleep();

  const token = await pollForToken(
    client,
    { userCode: 'ABCDE', interval: 5, expiresIn: 900 },
    { sleep },
  );

  assert.equal(token, 'tok123');
  assert.equal(client.calls.length, 3);
  assert.equal(sleep.calls.length, 3);
});

test('throws AuthError when the time is over', async () => {
  const client = fakeClient({ result: 'KO' }, { result: 'KO' });
  const sleep = fakeSleep();

  await assert.rejects(
    () =>
      pollForToken(client, { userCode: 'ABCDE', interval: 5, expiresIn: 10 }, { sleep }),
    AuthError,
  );
});
