import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { listenForRecovery, RECOVERY_INTERVAL_MS } from '../../../../../src/shared/cloud/sync/recoveryTriggers.js';

let visibility = 'visible';
beforeEach(() => {
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
