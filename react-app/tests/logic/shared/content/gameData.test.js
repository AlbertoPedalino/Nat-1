import test from 'node:test';
import assert from 'node:assert/strict';
import { GAME_DATA_BASE, loadGameData } from '../../../../src/shared/content/gameData.js';

test('a file is downloaded once and shared; a failed download is tried again', async () => {
  const calls = [];
  let fail = true;
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    calls.push(url);
    if (url.endsWith('flaky.json') && fail) return { ok: false, status: 503 };
    return { ok: true, json: async () => ({ url }) };
  };
  try {
    const [a, b] = await Promise.all([loadGameData('items-base.json'), loadGameData('/items-base.json')]);
    assert.equal(a, b);
    assert.deepEqual(calls, [`${GAME_DATA_BASE}items-base.json`]);

    await assert.rejects(loadGameData('flaky.json'), /HTTP 503/);
    fail = false;
    assert.deepEqual(await loadGameData('flaky.json'), { url: `${GAME_DATA_BASE}flaky.json` });
    assert.equal(calls.filter((url) => url.endsWith('flaky.json')).length, 2);
  } finally {
    globalThis.fetch = original;
  }
});
