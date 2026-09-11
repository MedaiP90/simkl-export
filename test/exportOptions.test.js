import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InvalidArgumentError } from 'commander';
import { makeListParser } from '../src/exportOptions.js';

const parseTypes = makeListParser(['movies', 'shows', 'anime'], {
  singular: 'type',
  plural: 'types',
});

test('trims, lowercases and dedupes', () => {
  assert.deepEqual(parseTypes(' Movies, shows ,shows,ANIME'), ['movies', 'shows', 'anime']);
});

test('rejects an unknown value with the valid values in the message', () => {
  assert.throws(
    () => parseTypes('movie'),
    (err) => {
      assert.ok(err instanceof InvalidArgumentError);
      assert.equal(err.message, 'Unknown type "movie". Valid types: movies, shows, anime');
      return true;
    },
  );
});
