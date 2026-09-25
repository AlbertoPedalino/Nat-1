import { act, fireEvent, render, screen } from '@testing-library/react';
import CharacterSheet from '../../../../src/pages/charsheet/CharacterSheet.jsx';
import CloudAutoSync from '../../../../src/shared/cloud/sync/CloudAutoSync.jsx';
import { saveCharacter, setActiveCharId } from '../../../../src/shared/character/profile/store.js';
import { buildOptionalFeatureEntryLookup } from '../../../../src/shared/character/progression/optionalFeatures.js';

// The optional-feature catalog is attached to the open sheet on load, never
// stored, and must survive every edit so invocation and action text resolves.

const CATALOG = [{ name: 'Agonizing Blast', source: 'XPHB', featureType: ['EI'], entries: ['Add your Charisma modifier.'] }];
const cloud = vi.hoisted(() => ({ save: vi.fn(), push: vi.fn(), list: vi.fn() }));
vi.mock('../../../../src/shared/cloud/api/cloudCharacters.js', () => ({
  updateCloudCharacterData: cloud.save, pushCharacter: cloud.push, updateForeignCharacter: cloud.push,
  commandCharacterVitals: vi.fn(), getCloudSheetRevision: vi.fn(async () => 0), getCloudCharacter: vi.fn(),
  SHEET_CONFLICT: 'SHEET_CONFLICT',
}));
vi.mock('../../../../src/shared/cloud/api/characterDigests.js', async (original) => ({
  ...await original(),
  listCharacterDigests: (...args) => cloud.list(...args),
  readCharacterSheets: async () => [],
}));
vi.mock('../../../../src/shared/cloud/auth/AuthProvider.jsx', () => ({
  useAuth: () => ({ cloudEnabled: true, status: 'authed', user: { id: 'owner' } }),
}));
vi.mock('../../../../src/shared/cloud/supabaseClient.js', () => ({
  supabase: {
    channel: () => ({ on() { return this; }, subscribe() { return this; } }),
    removeChannel: vi.fn(),
  },
}));
vi.mock('../../../../src/shared/cloud/sync/useRollChannel.js', () => ({ useRollChannel: () => ({ publish: vi.fn() }) }));
vi.mock('../../../../src/shared/cloud/sync/useCharacterCampaign.js', () => ({ useCharacterCampaign: () => null }));
vi.mock('../../../../src/pages/charsheet/state/sheetRuntimeAdapters.js', () => ({ ensureSheetRuntimeAdapters: async () => {} }));
vi.mock('../../../../src/pages/charbuilder/data/dataLoaders.js', async () => {
  const catalog = [{ name: 'Agonizing Blast', source: 'XPHB', featureType: ['EI'], entries: ['Add your Charisma modifier.'] }];
  return {
    loadItems: async () => [], loadOptionalFeatures: async () => catalog, loadConditions: async () => ({}),
    reconcileInventoryWithItemsDb: (inventory) => inventory,
  };
});
vi.mock('../../../../src/pages/charsheet/resources/HPBlock.jsx', () => ({ default: () => null }));
vi.mock('../../../../src/pages/charsheet/layout/TopBar.jsx', () => ({ default: () => null }));
vi.mock('../../../../src/pages/charsheet/stats/AbilityScores.jsx', () => ({ default: () => null }));
vi.mock('../../../../src/pages/charsheet/stats/SavingThrows.jsx', () => ({ default: () => null }));
vi.mock('../../../../src/pages/charsheet/stats/Senses.jsx', () => ({ default: () => null }));
vi.mock('../../../../src/pages/charsheet/stats/Skills.jsx', () => ({ default: () => null }));
vi.mock('../../../../src/pages/charsheet/stats/Movement.jsx', () => ({ default: () => null }));
vi.mock('../../../../src/pages/charsheet/stats/RightTop.jsx', () => ({ default: () => null }));
vi.mock('../../../../src/pages/charsheet/proficiency/Proficiencies.jsx', () => ({ default: () => null }));
// Renders what the Features tab resolves from the catalog on the sheet's C.
vi.mock('../../../../src/pages/charsheet/layout/TabsPanel.jsx', async () => {
  const { useSheetActions } = await import('../../../../src/pages/charsheet/state/SheetActionsContext.jsx');
  const { buildOptionalFeatureEntryLookup: lookup } = await import('../../../../src/shared/character/progression/optionalFeatures.js');
  return { default: ({ C }) => {
    const actions = useSheetActions();
    return <>
      <output data-testid="invocation">{lookup(C?.optionalFeatureEntries, 'EI')('Agonizing Blast')?.[0] || 'missing'}</output>
      <output data-testid="notes">{C?.notes || ''}</output>
      <button onClick={() => actions.onUpdateNotes(`${C?.notes || ''}+`)}>Edit notes</button>
    </>;
  } };
});

const character = {
  name: 'Warlock', className: 'Warlock', level: 5, clsSnapshot: { hd: { faces: 8 } },
  finalScores: { str: 10, dex: 10, con: 14, int: 10, wis: 10, cha: 16 },
  currentHP: 20, tempHP: 0, maxHPBonus: 0, deathSaves: { success: 0, fail: 0 }, activeConditions: [],
  choices: { invocations: ['Agonizing Blast'] }, notes: '',
};
async function flush() { await act(async () => { await vi.advanceTimersByTimeAsync(1500); }); }

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  cloud.save.mockReset().mockResolvedValue(undefined);
  cloud.push.mockReset().mockResolvedValue(undefined);
  cloud.list.mockReset().mockResolvedValue([]);
});
afterEach(() => { vi.useRealTimers(); });

test('sanity: the lookup resolves the catalog entry', () => {
  expect(buildOptionalFeatureEntryLookup(CATALOG, 'EI')('Agonizing Blast')).toEqual(['Add your Charisma modifier.']);
});

test('standalone sheet: local edits never store the catalog, and it stays in memory after each edit', async () => {
  saveCharacter('pc', character, { emit: false });
  setActiveCharId('pc');
  render(<><CloudAutoSync /><CharacterSheet /></>);
  await flush();
  expect(screen.getByTestId('invocation')).toHaveTextContent('Add your Charisma modifier.');
  for (let edit = 1; edit <= 2; edit += 1) {
    fireEvent.click(screen.getByText('Edit notes'));
    await flush();
    expect(screen.getByTestId('notes')).toHaveTextContent('+'.repeat(edit));
    expect(screen.getByTestId('invocation')).toHaveTextContent('Add your Charisma modifier.');
  }
  const stored = JSON.parse(localStorage.getItem('gb:char:pc'));
  expect(stored.notes).toBe('++');
  expect(stored).not.toHaveProperty('optionalFeatureEntries');
  expect(cloud.push).toHaveBeenCalled(); // the autosync push reads storage, which has no catalog
});

test('embedded cloud sheet: the catalog survives edits (the API strips it on write)', async () => {
  render(<CharacterSheet externalChar={character} externalCharId="pc" embedded />);
  await flush();
  fireEvent.click(screen.getByText('Edit notes'));
  await flush();
  expect(screen.getByTestId('invocation')).toHaveTextContent('Add your Charisma modifier.');
  expect(cloud.save).toHaveBeenCalledWith('pc', expect.objectContaining({ notes: '+' }), expect.anything());
  expect(localStorage.getItem('gb:char:pc')).toBeNull();
});
