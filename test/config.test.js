import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { getClientId, upsertEnvLine } from '../src/config.js';
import { ConfigError } from '../src/errors.js';

describe('upsertEnvLine', () => {
  it('replaces an existing key', () => {
    const content = 'FOO=old\nBAR=keep\n';
    assert.equal(upsertEnvLine(content, 'FOO', 'new'), 'FOO=new\nBAR=keep\n');
  });

  it('appends a missing key', () => {
    const content = 'FOO=bar\n';
    assert.equal(upsertEnvLine(content, 'BAZ', 'qux'), 'FOO=bar\nBAZ=qux\n');
  });

  it('keeps comments and other keys', () => {
    const content = '# a comment\nFOO=bar\n# another comment\nBAZ=qux\n';
    assert.equal(
      upsertEnvLine(content, 'FOO', 'new'),
      '# a comment\nFOO=new\n# another comment\nBAZ=qux\n',
    );
  });

  it('handles empty content', () => {
    assert.equal(upsertEnvLine('', 'FOO', 'bar'), 'FOO=bar\n');
  });

  it('handles a file without a final newline', () => {
    assert.equal(upsertEnvLine('FOO=bar', 'BAZ', 'qux'), 'FOO=bar\nBAZ=qux\n');
  });
});

describe('getClientId', () => {
  const original = process.env.SIMKL_CLIENT_ID;

  beforeEach(() => {
    delete process.env.SIMKL_CLIENT_ID;
  });

  afterEach(() => {
    if (original === undefined) {
      delete process.env.SIMKL_CLIENT_ID;
    } else {
      process.env.SIMKL_CLIENT_ID = original;
    }
  });

  it('throws ConfigError when the env var is empty', () => {
    process.env.SIMKL_CLIENT_ID = '  ';
    assert.throws(() => getClientId(), ConfigError);
  });

  it('returns the trimmed value when set', () => {
    process.env.SIMKL_CLIENT_ID = '  abc123  ';
    assert.equal(getClientId(), 'abc123');
  });
});
