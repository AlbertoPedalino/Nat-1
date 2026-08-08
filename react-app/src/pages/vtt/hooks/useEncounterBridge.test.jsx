import { act, renderHook } from '@testing-library/react';
import { vi } from 'vitest';
import { useEncounterBridge } from './useEncounterBridge.js';

const storage = vi.hoisted(() => ({
  readPersistedInstance: vi.fn(() => ({
    fightsData: {
      activeFightId: 'fight-1',
      items: [{ id: 'fight-1', fight: { combatants: [] } }],
    },
  })),
}));

vi.mock('../../encounterbuilder/logic/storage.js', () => ({
  persistFights: vi.fn(),
  readPersistedInstance: storage.readPersistedInstance,
  readRegistry: () => [],
}));
vi.mock('../../encounterbuilder/logic/combat.js', () => ({
  restoreFight: () => ({ combatants: [] }),
}));

test('cross-tab encounter sync ignores unrelated localStorage traffic', () => {
  renderHook(() => useEncounterBridge({
    tokens: [{ id: 'token-1', sourceRef: 'instance-1:fight-1:combatant-1' }],
    onTokenVitals: vi.fn(),
  }));
  expect(storage.readPersistedInstance).toHaveBeenCalledTimes(1);

  act(() => window.dispatchEvent(new StorageEvent('storage', { key: 'some-other-feature' })));
  expect(storage.readPersistedInstance).toHaveBeenCalledTimes(1);

  act(() => window.dispatchEvent(new StorageEvent('storage', { key: 'gb:enc:instance-1:fights:v1' })));
  expect(storage.readPersistedInstance).toHaveBeenCalledTimes(2);
});
