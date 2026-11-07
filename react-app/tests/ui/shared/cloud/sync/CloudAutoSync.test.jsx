import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import CloudAutoSync, { DEBOUNCE_MS } from '../../../../../src/shared/cloud/sync/CloudAutoSync.jsx';
import { RECOVERY_INTERVAL_MS } from '../../../../../src/shared/cloud/sync/recoveryTriggers.js';
import { markCharacterSynced, saveCharacter } from '../../../../../src/shared/character/profile/store.js';
import { reportCloudSyncState, setCloudSyncState } from '../../../../../src/shared/cloud/sync/cloudSyncState.js';

const cloud = vi.hoisted(() => ({ push: vi.fn(async () => {}) }));
vi.mock('../../../../../src/shared/cloud/api/cloudCharacters.js', () => ({
  pushCharacter: cloud.push, updateForeignCharacter: cloud.push, SHEET_CONFLICT: 'SHEET_CONFLICT',
}));
vi.mock('../../../../../src/shared/cloud/auth/AuthProvider.jsx', () => ({
  useAuth: () => ({ cloudEnabled: true, status: 'authed', cloudActive: true, user: { id: 'owner' } }),
}));
vi.mock('../../../../../src/shared/cloud/supabaseClient.js', () => ({ requireClient: () => ({}) }));

beforeEach(() => {
  localStorage.clear();
  cloud.push.mockClear();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

// A local edit saved while nothing was listening (a push that failed, a tab
// closed inside the debounce, a sheet made while logged out).
function unsyncedCharacter(id) {
  saveCharacter(id, { name: id });
  setCloudSyncState(id, null);
}

test('an edit the cloud never acknowledged is sent when the app starts logged in', async () => {
  unsyncedCharacter('c_left');
  render(<CloudAutoSync />);
  await act(async () => { vi.advanceTimersByTime(DEBOUNCE_MS + 10); });
  expect(cloud.push).toHaveBeenCalledWith('c_left');
});

test('a push that failed is retried while the app stays open, without a new edit', async () => {
  cloud.push.mockRejectedValueOnce(new Error('network down'));
  unsyncedCharacter('c_retry');
  render(<CloudAutoSync />);
  await act(async () => { vi.advanceTimersByTime(DEBOUNCE_MS + 10); });
  expect(cloud.push).toHaveBeenCalledTimes(1);
  await act(async () => { vi.advanceTimersByTime(RECOVERY_INTERVAL_MS + DEBOUNCE_MS + 10); });
  expect(cloud.push).toHaveBeenCalledTimes(2);
});

test('synced characters and those waiting on a conflict are not re-sent', async () => {
  unsyncedCharacter('c_done');
  markCharacterSynced('c_done', 4);
  unsyncedCharacter('c_conflict');
  reportCloudSyncState('c_conflict', 'conflict');
  render(<CloudAutoSync />);
  await act(async () => { vi.advanceTimersByTime(RECOVERY_INTERVAL_MS + DEBOUNCE_MS + 10); });
  expect(cloud.push).not.toHaveBeenCalled();
});
