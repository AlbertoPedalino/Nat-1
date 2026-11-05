import { act, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createInstance, updateInstance, CLOUD_STATES } from '../../../../src/shared/instances/instanceStore.js';
import { useToolInstance } from '../../../../src/shared/instances/useToolInstance.js';
import { RECOVERY_INTERVAL_MS } from '../../../../src/shared/cloud/sync/recoveryTriggers.js';

const mocks = vi.hoisted(() => ({ refresh: vi.fn(async () => 'local'), notify: vi.fn() }));
vi.mock('../../../../src/shared/cloud/auth/AuthProvider.jsx', () => ({
  useAuth: () => ({ cloudEnabled: true, status: 'authed' }),
}));
vi.mock('../../../../src/shared/ui/ToastProvider.jsx', () => ({ useToast: () => ({ notify: mocks.notify }) }));
vi.mock('../../../../src/shared/instances/instanceSync.js', async (original) => ({
  ...(await original()),
  isInstanceSyncOnline: () => true,
  subscribeInstanceSyncAvailability: () => () => {},
  refreshInstance: (...args) => mocks.refresh(...args),
}));

beforeEach(() => {
  localStorage.clear();
  mocks.refresh.mockClear();
  mocks.notify.mockClear();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

function openLinkedScreen() {
  const entry = createInstance('dmscreen', { id: 'dm_follow' });
  updateInstance('dmscreen', entry.id, (current) => ({ ...current, cloud: CLOUD_STATES.LINKED, version: 3 }));
  return renderHook(() => useToolInstance('dmscreen'), {
    wrapper: ({ children }) => <MemoryRouter initialEntries={['/dm-screen?screen=dm_follow']}>{children}</MemoryRouter>,
  });
}

test('an open linked instance checks the cloud every 30 s and tells the user when it pulled', async () => {
  const { result } = openLinkedScreen();
  expect(result.current.ready).toBe(true);
  mocks.refresh.mockClear(); // the check made on opening
  mocks.refresh.mockResolvedValueOnce('pulled');
  await act(async () => { vi.advanceTimersByTime(RECOVERY_INTERVAL_MS); });
  expect(mocks.refresh).toHaveBeenCalledWith('dmscreen', 'dm_follow');
  expect(mocks.notify).toHaveBeenCalledWith('info', 'Changes made on another device are now shown.');
});

test('no check runs while the user is typing in a text field: it waits for the next turn', async () => {
  openLinkedScreen();
  mocks.refresh.mockClear();
  const field = document.createElement('textarea');
  document.body.appendChild(field);
  field.focus();
  await act(async () => { vi.advanceTimersByTime(RECOVERY_INTERVAL_MS); });
  expect(mocks.refresh).not.toHaveBeenCalled();
  field.blur();
  await act(async () => { vi.advanceTimersByTime(RECOVERY_INTERVAL_MS); });
  expect(mocks.refresh).toHaveBeenCalledTimes(1);
});
