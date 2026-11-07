import { afterEach, beforeEach, expect, test, vi } from 'vitest';

const digest = vi.hoisted(() => ({ answers: {}, read: null, missing: false }));
vi.mock('../../../../../src/shared/cloud/api/syncDigest.js', () => ({
  readSyncDigest: (...args) => digest.read(...args),
  isMissingSyncDigest: (error) => error?.code === 'PGRST202',
}));

import { listenForRecovery, RECOVERY_INTERVAL_MS, watchRevisions } from '../../../../../src/shared/cloud/sync/recoveryTriggers.js';

let visibility = 'visible';
beforeEach(() => {
  digest.answers = {};
  digest.read = vi.fn(async (keys) => Object.fromEntries(keys.map((key) => [key, digest.answers[key] ?? null])));
  vi.useFakeTimers();
  visibility = 'visible';
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

test('online runs at once; focus and visibility arriving together run once', () => {
  const run = vi.fn();
  const stop = listenForRecovery(run);
  window.dispatchEvent(new Event('online'));
  expect(run).toHaveBeenLastCalledWith('online');
  run.mockClear();
  window.dispatchEvent(new Event('focus'));
  document.dispatchEvent(new Event('visibilitychange'));
  expect(run).toHaveBeenCalledTimes(1);
  expect(run).toHaveBeenCalledWith('focus');
  stop();
});

test('the interval runs only while the page is shown, unless asked to run hidden', () => {
  const shown = vi.fn();
  const always = vi.fn();
  const stopShown = listenForRecovery(shown, { periodic: true });
  const stopAlways = listenForRecovery(always, { periodic: true, whenHidden: true });
  vi.advanceTimersByTime(RECOVERY_INTERVAL_MS);
  expect(shown).toHaveBeenCalledWith('interval');
  expect(always).toHaveBeenCalledWith('interval');
  shown.mockClear();
  always.mockClear();
  visibility = 'hidden';
  vi.advanceTimersByTime(RECOVERY_INTERVAL_MS);
  expect(shown).not.toHaveBeenCalled();
  expect(always).toHaveBeenCalledTimes(1);
  stopShown();
  stopAlways();
});

test('stopping removes every trigger', () => {
  const run = vi.fn();
  const stop = listenForRecovery(run, { periodic: true });
  stop();
  window.dispatchEvent(new Event('online'));
  window.dispatchEvent(new Event('focus'));
  vi.advanceTimersByTime(RECOVERY_INTERVAL_MS * 2);
  expect(run).not.toHaveBeenCalled();
});

test('without an interval nothing runs on a timer', () => {
  const run = vi.fn();
  const stop = listenForRecovery(run);
  vi.advanceTimersByTime(RECOVERY_INTERVAL_MS * 4);
  expect(run).not.toHaveBeenCalled();
  stop();
});

test('checks registered at different times share one heartbeat', () => {
  const setIntervalSpy = vi.spyOn(window, 'setInterval');
  const first = vi.fn();
  const second = vi.fn();
  const stopFirst = listenForRecovery(first, { periodic: true });
  vi.advanceTimersByTime(RECOVERY_INTERVAL_MS / 2);
  const stopSecond = listenForRecovery(second, { periodic: true });
  expect(setIntervalSpy).toHaveBeenCalledTimes(1);
  vi.advanceTimersByTime(RECOVERY_INTERVAL_MS / 2);
  expect(first).toHaveBeenCalledTimes(1);
  expect(second).toHaveBeenCalledTimes(1);
  stopFirst();
  stopSecond();
});

test('a check that throws does not stop the others', () => {
  const failing = vi.fn(() => { throw new Error('boom'); });
  const healthy = vi.fn();
  const queued = vi.spyOn(globalThis, 'queueMicrotask').mockImplementation(() => {});
  const stopFailing = listenForRecovery(failing);
  const stopHealthy = listenForRecovery(healthy);
  window.dispatchEvent(new Event('online'));
  expect(healthy).toHaveBeenCalledWith('online');
  expect(queued).toHaveBeenCalledTimes(1);
  stopFailing();
  stopHealthy();
});

test('one read covers every watcher; only views whose keys moved are called', async () => {
  const scene = vi.fn();
  const sheet = vi.fn();
  digest.answers = { 'scene:1': 'a', 'tokens:1': 'x', 'sheet:pc': '3' };
  const stopScene = watchRevisions(['scene:1', 'tokens:1'], scene);
  const stopSheet = watchRevisions(['sheet:pc'], sheet);

  // First sight: everything counts as moved.
  await vi.advanceTimersByTimeAsync(RECOVERY_INTERVAL_MS);
  expect(digest.read).toHaveBeenCalledTimes(1);
  expect(digest.read).toHaveBeenCalledWith(['scene:1', 'tokens:1', 'sheet:pc']);
  expect(scene).toHaveBeenCalledWith('interval', ['scene:1', 'tokens:1']);
  expect(sheet).toHaveBeenCalledWith('interval', ['sheet:pc']);

  // Quiet: one read, nobody called.
  scene.mockClear();
  sheet.mockClear();
  await vi.advanceTimersByTimeAsync(RECOVERY_INTERVAL_MS);
  expect(digest.read).toHaveBeenCalledTimes(2);
  expect(scene).not.toHaveBeenCalled();
  expect(sheet).not.toHaveBeenCalled();

  // A piece moved: only the scene, only that key.
  digest.answers['tokens:1'] = 'y';
  window.dispatchEvent(new Event('online'));
  await vi.advanceTimersByTimeAsync(0);
  expect(scene).toHaveBeenCalledWith('online', ['tokens:1']);
  expect(sheet).not.toHaveBeenCalled();
  stopScene();
  stopSheet();
});

test('a view that could not catch up is called again next time', async () => {
  const onChange = vi.fn().mockResolvedValueOnce(false).mockResolvedValue(undefined);
  digest.answers = { 'clock:c': 't1' };
  const stop = watchRevisions(['clock:c'], onChange);
  await vi.advanceTimersByTimeAsync(RECOVERY_INTERVAL_MS);
  await vi.advanceTimersByTimeAsync(RECOVERY_INTERVAL_MS);
  await vi.advanceTimersByTimeAsync(RECOVERY_INTERVAL_MS);
  expect(onChange).toHaveBeenCalledTimes(2);
  stop();
});

test('a view whose catch-up never answers is asked again after an interval', async () => {
  const onChange = vi.fn(() => new Promise(() => {}));
  digest.answers = { 'scene:1': 'a' };
  const stop = watchRevisions(['scene:1'], onChange);
  await vi.advanceTimersByTimeAsync(RECOVERY_INTERVAL_MS);
  expect(onChange).toHaveBeenCalledTimes(1);
  window.dispatchEvent(new Event('online'));
  await vi.advanceTimersByTimeAsync(0);
  expect(onChange).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(RECOVERY_INTERVAL_MS);
  expect(onChange).toHaveBeenCalledTimes(2);
  stop();
});

test('without the database function every view is called, and the function is not asked again', async () => {
  digest.read = vi.fn(async () => { throw Object.assign(new Error('missing'), { code: 'PGRST202' }); });
  const onChange = vi.fn();
  const stop = watchRevisions(['scene:1'], onChange);
  await vi.advanceTimersByTimeAsync(RECOVERY_INTERVAL_MS);
  await vi.advanceTimersByTimeAsync(RECOVERY_INTERVAL_MS);
  expect(onChange).toHaveBeenCalledTimes(2);
  expect(onChange).toHaveBeenLastCalledWith('interval', ['scene:1']);
  expect(digest.read).toHaveBeenCalledTimes(1);
  stop();
});
