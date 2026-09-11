import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { COLUMNS, toRows, toAllRow } from '../src/rows.js';

const fixturePath = fileURLToPath(new URL('./fixtures/library.json', import.meta.url));
const library = JSON.parse(readFileSync(fixturePath, 'utf8'));

function keysOf(row) {
  return Object.keys(row).sort();
}

test('movie produces exactly one row', () => {
  const rows = toRows('movies', library.movies[0]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].title, 'Sample Movie One');
  assert.equal(rows[0].year, 2020);
  assert.equal(rows[0].status, 'completed');
  assert.equal(rows[0].simkl_id, 101);
  assert.equal(rows[0].imdb_id, 'tt1000001');
  assert.equal(rows[0].tmdb_id, 2000001);
});

test('show with 2x2 watched episodes produces 4 rows in season/episode order', () => {
  const rows = toRows('shows', library.shows[0]);
  assert.equal(rows.length, 4);
  assert.deepEqual(
    rows.map((r) => [r.season, r.episode]),
    [[1, 1], [1, 2], [2, 1], [2, 2]],
  );
  assert.equal(rows[0].episode_watched_at, '2024-01-05T18:00:00Z');
  assert.equal(rows[3].episode_watched_at, '2024-02-12T18:00:00Z');
});

test('plan-to-watch show with no seasons produces one row with empty episode fields', () => {
  const rows = toRows('shows', library.shows[1]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].season, '');
  assert.equal(rows[0].episode, '');
  assert.equal(rows[0].episode_watched_at, '');
});

test('anime movie produces one row with anime_type "movie"', () => {
  const rows = toRows('anime', library.anime[1]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].anime_type, 'movie');
  assert.equal(rows[0].season, '');
  assert.equal(rows[0].episode, '');
});

test('anime with watched episodes produces one row per episode', () => {
  const rows = toRows('anime', library.anime[0]);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].mal_id, 5001);
  assert.equal(rows[2].episode, 3);
});

test('missing ids and null dates become empty strings', () => {
  const [movieRow] = toRows('movies', library.movies[1]);
  assert.equal(movieRow.last_watched_at, '');
  assert.equal(movieRow.tmdb_id, '');
  assert.equal(movieRow.tvdb_id, '');

  const [animeRow] = toRows('anime', library.anime[0]);
  assert.equal(animeRow.anidb_id, '');
  assert.equal(animeRow.anilist_id, '');
  assert.equal(animeRow.kitsu_id, '');
  assert.equal(animeRow.tmdb_id, '');
});

test('every row has exactly the keys of its COLUMNS list', () => {
  for (const [type, items] of Object.entries(library)) {
    const expectedKeys = [...COLUMNS[type]].sort();
    for (const item of items) {
      for (const row of toRows(type, item)) {
        assert.deepEqual(keysOf(row), expectedKeys, `${type} row keys mismatch`);
      }
    }
  }
});

test('toAllRow adds type and fills missing columns with empty strings', () => {
  const [movieRow] = toRows('movies', library.movies[0]);
  const allRow = toAllRow('movies', movieRow);

  assert.equal(allRow.type, 'movie');
  assert.equal(allRow.season, '');
  assert.equal(allRow.anime_type, '');
  assert.equal(allRow.mal_id, '');
  assert.equal(allRow.title, 'Sample Movie One');
  assert.deepEqual(keysOf(allRow), [...COLUMNS.all].sort());
});

test('COLUMNS.all contains every column of the three lists exactly once, plus type', () => {
  const expected = new Set(['type', ...COLUMNS.movies, ...COLUMNS.shows, ...COLUMNS.anime]);
  assert.equal(new Set(COLUMNS.all).size, COLUMNS.all.length, 'no duplicate columns');
  assert.deepEqual([...COLUMNS.all].sort(), [...expected].sort());
});
