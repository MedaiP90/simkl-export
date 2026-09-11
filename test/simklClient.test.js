import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SimklClient } from '../src/simklClient.js';
import { ApiError, AuthError, ConfigError } from '../src/errors.js';

const noDelay = async () => {};

function jsonResponse(status, body, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => headers[name] ?? null },
    json: async () => body,
  };
}

function fakeFetch(...responses) {
  const calls = [];
  const fetchFn = async (url, init) => {
    calls.push({ url, init });
    return responses[calls.length - 1];
  };
  fetchFn.calls = calls;
  return fetchFn;
}

test('adds client_id, app-name, app-version and User-Agent on every call', async () => {
  const fetchFn = fakeFetch(jsonResponse(200, { ok: true }));
  const client = new SimklClient({ clientId: 'cid123', fetchFn, delayFn: noDelay });

  await client.get('/sync/all-items/movies');

  const { url, init } = fetchFn.calls[0];
  assert.equal(url.searchParams.get('client_id'), 'cid123');
  assert.ok(url.searchParams.get('app-name'));
  assert.ok(url.searchParams.get('app-version'));
  assert.ok(init.headers['User-Agent']);
});

test('adds Authorization only when a token is set', async () => {
  const withoutToken = fakeFetch(jsonResponse(200, {}));
  const client1 = new SimklClient({ clientId: 'cid', fetchFn: withoutToken, delayFn: noDelay });
  await client1.get('/x');
  assert.equal(withoutToken.calls[0].init.headers.Authorization, undefined);

  const withToken = fakeFetch(jsonResponse(200, {}));
  const client2 = new SimklClient({
    clientId: 'cid',
    accessToken: 'tok',
    fetchFn: withToken,
    delayFn: noDelay,
  });
  await client2.get('/x');
  assert.equal(withToken.calls[0].init.headers.Authorization, 'Bearer tok');
});

test('401 throws AuthError', async () => {
  const fetchFn = fakeFetch(jsonResponse(401, { error: 'user_token_failed' }));
  const client = new SimklClient({ clientId: 'cid', fetchFn, delayFn: noDelay });

  await assert.rejects(() => client.get('/x'), AuthError);
});

test('412 throws ConfigError', async () => {
  const fetchFn = fakeFetch(jsonResponse(412, { error: 'client_id_failed' }));
  const client = new SimklClient({ clientId: 'cid', fetchFn, delayFn: noDelay });

  await assert.rejects(() => client.get('/x'), ConfigError);
});

test('429 then 200 retries once and returns the body', async () => {
  const fetchFn = fakeFetch(
    jsonResponse(429, { error: 'rate_limit' }, { 'Retry-After': '1' }),
    jsonResponse(200, { movies: [] }),
  );
  const client = new SimklClient({ clientId: 'cid', fetchFn, delayFn: noDelay });

  const body = await client.get('/x');

  assert.deepEqual(body, { movies: [] });
  assert.equal(fetchFn.calls.length, 2);
});

test('429 four times throws ApiError', async () => {
  const fetchFn = fakeFetch(
    jsonResponse(429, {}),
    jsonResponse(429, {}),
    jsonResponse(429, {}),
    jsonResponse(429, {}),
  );
  const client = new SimklClient({ clientId: 'cid', fetchFn, delayFn: noDelay });

  await assert.rejects(() => client.get('/x'), ApiError);
  assert.equal(fetchFn.calls.length, 4);
});
