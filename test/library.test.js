import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchLibrary, TYPES, STATUSES } from '../src/library.js';

function fakeClient(bodiesByPath) {
  const calls = [];
  return {
    calls,
    async get(path, query) {
      calls.push({ path, query });
      return bodiesByPath[path] ?? {};
    },
  };
}

test('calls one URL per requested type, with the four query params', async () => {
  const client = fakeClient({
    '/sync/all-items/movies': { movies: [] },
    '/sync/all-items/shows': { shows: [] },
  });

  await fetchLibrary(client, { types: ['movies', 'shows'], statuses: STATUSES });

  assert.equal(client.calls.length, 2);
  assert.deepEqual(
    client.calls.map((call) => call.path),
    ['/sync/all-items/movies', '/sync/all-items/shows'],
  );
  for (const call of client.calls) {
    assert.deepEqual(call.query, {
      extended: 'full',
      episode_watched_at: 'yes',
      include_all_episodes: 'yes',
      language: 'en',
    });
  }
});

test('filters by status', async () => {
  const client = fakeClient({
    '/sync/all-items/movies': {
      movies: [
        { status: 'completed', movie: { title: 'A' } },
        { status: 'dropped', movie: { title: 'B' } },
        { status: 'plantowatch', movie: { title: 'C' } },
      ],
    },
  });

  const library = await fetchLibrary(client, {
    types: ['movies'],
    statuses: ['completed', 'plantowatch'],
  });

  assert.deepEqual(
    library.movies.map((item) => item.movie.title),
    ['A', 'C'],
  );
});

test('{} body maps to empty array, no crash', async () => {
  const client = fakeClient({ '/sync/all-items/anime': {} });

  const library = await fetchLibrary(client, { types: ['anime'], statuses: STATUSES });

  assert.deepEqual(library.anime, []);
});

test('only requested types appear in the result', async () => {
  const client = fakeClient({
    '/sync/all-items/shows': { shows: [] },
  });

  const library = await fetchLibrary(client, { types: ['shows'], statuses: STATUSES });

  assert.deepEqual(Object.keys(library), ['shows']);
});

test('TYPES and STATUSES export the documented values', () => {
  assert.deepEqual(TYPES, ['movies', 'shows', 'anime']);
  assert.deepEqual(STATUSES, ['watching', 'plantowatch', 'hold', 'dropped', 'completed']);
});
