import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { resolveOutputDir, toCsv, writeExport } from '../src/csvWriter.js';
import { COLUMNS } from '../src/rows.js';

const BOM = '﻿';

async function withTempDir(fn) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'simkl-export-test-'));
  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test('resolveOutputDir uses the local date under baseDir', () => {
  const outputDir = resolveOutputDir('./x', new Date(2026, 8, 11));
  assert.ok(outputDir.endsWith(path.join('x', '2026-09-11')));
});

test('toCsv escapes commas, quotes and newlines per RFC 4180', () => {
  const csv = toCsv(['title'], [{ title: 'Love, Death & "Robots"' }]);
  const lines = csv.replace(BOM, '').split('\n');
  assert.equal(lines[0], 'title');
  assert.equal(lines[1], '"Love, Death & ""Robots"""');
});

test('toCsv writes non-ASCII titles correctly', () => {
  const csv = toCsv(['title'], [{ title: '進撃の巨人' }, { title: 'Amélie' }]);
  const lines = csv.replace(BOM, '').split('\n').filter(Boolean);
  assert.equal(lines[1], '進撃の巨人');
  assert.equal(lines[2], 'Amélie');
});

test('writeExport writes per-type files and all.csv, overwriting on re-run', async () => {
  await withTempDir(async (dir) => {
    const rowsByType = {
      movies: [{ title: 'Movie One', year: 2020, status: 'completed', last_watched_at: '', added_to_watchlist_at: '', simkl_id: 1, imdb_id: '', tmdb_id: '', tvdb_id: '' }],
      shows: [],
    };

    const results = await writeExport(dir, rowsByType);

    const moviesFile = path.join(dir, 'movies.csv');
    const showsFile = path.join(dir, 'shows.csv');
    const allFile = path.join(dir, 'all.csv');

    const moviesCsv = await readFile(moviesFile, 'utf8');
    assert.ok(moviesCsv.startsWith(BOM));
    assert.equal(moviesCsv.replace(BOM, '').split('\n')[0], COLUMNS.movies.join(','));

    const showsCsv = await readFile(showsFile, 'utf8');
    const showsLines = showsCsv.replace(BOM, '').split('\n').filter(Boolean);
    assert.equal(showsLines.length, 1);
    assert.equal(showsLines[0], COLUMNS.shows.join(','));

    const allCsv = await readFile(allFile, 'utf8');
    const allLines = allCsv.replace(BOM, '').split('\n').filter(Boolean);
    assert.equal(allLines.length, 2);
    assert.ok(allLines[1].startsWith('movie,'));

    assert.deepEqual(
      results.map((r) => ({ file: r.file, rowCount: r.rowCount })),
      [
        { file: moviesFile, rowCount: 1 },
        { file: showsFile, rowCount: 0 },
        { file: allFile, rowCount: 1 },
      ],
    );
    assert.ok(path.isAbsolute(results[0].file));

    // Same-day re-run overwrites the folder.
    await writeExport(dir, { movies: [] });
    const overwritten = await readFile(moviesFile, 'utf8');
    const overwrittenLines = overwritten.replace(BOM, '').split('\n').filter(Boolean);
    assert.equal(overwrittenLines.length, 1);
  });
});
