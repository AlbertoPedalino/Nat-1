import { act, fireEvent, render, screen } from '@testing-library/react';
import CharacterSheet from '../../../../src/pages/charsheet/CharacterSheet.jsx';
import CampaignSheetView from '../../../../src/pages/campaignsheet/CampaignSheetView.jsx';
import CloudAutoSync from '../../../../src/shared/cloud/sync/CloudAutoSync.jsx';
import { loadCharacter, saveCharacter, setActiveCharId } from '../../../../src/shared/character/profile/store.js';
import { excludeFromSync } from '../../../../src/shared/cloud/sync/cloudSyncExclude.js';

const cloud = vi.hoisted(() => ({ save: vi.fn(), command: vi.fn(), push: vi.fn(), get: vi.fn(), live: null, receive: null }));
vi.mock('../../../../src/shared/cloud/api/cloudCharacters.js', () => ({
  updateCloudCharacterData: cloud.save, pushCharacter: cloud.push, updateForeignCharacter: cloud.push,
  getCloudCharacter: cloud.get, commandCharacterVitals: cloud.command,
}));
vi.mock('../../../../src/shared/cloud/auth/AuthProvider.jsx', () => ({
  useAuth: () => ({ cloudEnabled: true, status: 'authed', user: { id: 'owner' } }),
}));
vi.mock('../../../../src/shared/cloud/supabaseClient.js', () => ({
  supabase: {
    channel: () => ({
      on(_event, _filter, receive) { cloud.receive = receive; return this; },
      subscribe() { return this; },
    }),
    removeChannel: vi.fn(),
  },
}));
vi.mock('../../../../src/shared/cloud/sync/useCloudCharacterLive.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { useCloudCharacterLive: (options) => {
    cloud.live = options;
    actual.useCloudCharacterLive(options);
  } };
});
vi.mock('../../../../src/shared/cloud/sync/useRollChannel.js', () => ({ useRollChannel: () => ({ publish: vi.fn() }) }));
vi.mock('../../../../src/shared/cloud/sync/useCharacterCampaign.js', () => ({ useCharacterCampaign: () => null }));
vi.mock('../../../../src/pages/charsheet/state/sheetRuntimeAdapters.js', () => ({ ensureSheetRuntimeAdapters: async () => {} }));
vi.mock('../../../../src/pages/charbuilder/data/dataLoaders.js', () => ({
  loadItems: async () => [], loadOptionalFeatures: async () => [], loadConditions: async () => ({}),
  reconcileInventoryWithItemsDb: (inventory) => inventory,
}));
vi.mock('../../../../src/pages/charsheet/resources/HPBlock.jsx', () => ({ default: ({ sheet, onDamage }) => (
  <><output data-testid="hp">{sheet.currentHP}</output><button onClick={() => onDamage(1)}>Damage</button></>
) }));
vi.mock('../../../../src/pages/charsheet/layout/TopBar.jsx', () => ({ default: () => null }));
vi.mock('../../../../src/pages/charsheet/stats/AbilityScores.jsx', () => ({ default: () => null }));
vi.mock('../../../../src/pages/charsheet/stats/SavingThrows.jsx', () => ({ default: () => null }));
vi.mock('../../../../src/pages/charsheet/stats/Senses.jsx', () => ({ default: () => null }));
vi.mock('../../../../src/pages/charsheet/stats/Skills.jsx', () => ({ default: () => null }));
vi.mock('../../../../src/pages/charsheet/stats/Movement.jsx', () => ({ default: () => null }));
vi.mock('../../../../src/pages/charsheet/stats/RightTop.jsx', () => ({ default: () => null }));
vi.mock('../../../../src/pages/charsheet/proficiency/Proficiencies.jsx', () => ({ default: () => null }));
vi.mock('../../../../src/pages/charsheet/layout/TabsPanel.jsx', async () => {
  const { useSheetActions } = await import('../../../../src/pages/charsheet/state/SheetActionsContext.jsx');
  return { default: () => {
    const actions = useSheetActions();
    return <button onClick={() => actions.onUpdateNotes('Local note')}>Edit notes</button>;
  } };
});

const character = {
  name: 'Fighter', className: 'Fighter', level: 5, clsSnapshot: { hd: { faces: 10 } },
  finalScores: { str: 10, dex: 10, con: 14, int: 10, wis: 10, cha: 10 },
  currentHP: 20, tempHP: 0, maxHPBonus: 0, deathSaves: { success: 0, fail: 0 }, activeConditions: [],
};
const props = { externalChar: character, externalCharId: 'character', embedded: true };
function vitals(currentHP) { return { currentHP, tempHP: 0, maxHPBonus: 0, activeConditions: [], deathSaves: { success: 0, fail: 0 } }; }
async function flush() { await act(async () => { await vi.advanceTimersByTimeAsync(1500); }); }
async function openSheet() {
  const view = render(<CharacterSheet {...props} />);
  await act(async () => { await vi.advanceTimersByTimeAsync(0); });
  expect(screen.getByTestId('hp')).toHaveTextContent('20');
  return view;
}
beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  cloud.save.mockReset().mockResolvedValue(undefined);
  cloud.command.mockReset().mockImplementation(async () => ({ id: 'character', row_revision: 1, data: { ...character, currentHP: 19 } }));
  cloud.push.mockReset().mockResolvedValue(undefined);
  cloud.get.mockReset().mockResolvedValue({ id: 'character', data: character, updated_at: '2026-09-05T10:05:00.000Z' });
  cloud.live = null;
  cloud.receive = null;
});
afterEach(() => { vi.useRealTimers(); window.history.replaceState({}, '', '/'); });

async function receive(currentHP, revision) {
  await act(async () => cloud.receive({ new: { id: 'character', row_revision: revision, data: { ...character, currentHP } } }));
}

async function openLocalSheet() {
  saveCharacter('character', character, { emit: false });
  setActiveCharId('character');
  render(<><CloudAutoSync /><CharacterSheet /></>);
  await flush();
  cloud.push.mockClear();
}

test.each([true, false])('embedded=%s reads authoritative HP and sends damage as an intent', async (embedded) => {
  render(<CharacterSheet {...props} embedded={embedded} />);
  await flush();
  await receive(15, 1);
  cloud.command.mockResolvedValue({ id: 'character', row_revision: 2, data: { ...character, currentHP: 14 } });
  fireEvent.click(screen.getByText('Damage'));
  expect(screen.getByTestId('hp')).toHaveTextContent('15');
  await flush();
  expect(cloud.command).toHaveBeenCalledWith('character', { type: 'modifyHp', delta: -1 });
  expect(screen.getByTestId('hp')).toHaveTextContent('14');
  await receive(20, 0);
  expect(screen.getByTestId('hp')).toHaveTextContent('14');
  expect(cloud.save).not.toHaveBeenCalled();
});

test('received vitals before sheet initialization are applied without writing them back', async () => {
  render(<CharacterSheet {...props} embedded={false} liveVitals={vitals(15)} />);
  await flush();
  expect(screen.getByTestId('hp')).toHaveTextContent('15');
  expect(cloud.save).not.toHaveBeenCalled();
  expect(cloud.command).not.toHaveBeenCalled();
});

test('remote damage and local notes share a sheet without sending a health command', async () => {
  await openSheet();
  fireEvent.click(screen.getByText('Edit notes'));
  await receive(15, 1);
  await flush();
  expect(cloud.save).toHaveBeenCalledWith('character', expect.objectContaining({ currentHP: 15, notes: 'Local note' }));
  expect(cloud.command).not.toHaveBeenCalled();
});

test('a pending damage command accepts GM updates; an older acknowledgement cannot overwrite them', async () => {
  let finish;
  cloud.command.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  await openSheet();
  fireEvent.click(screen.getByText('Damage'));
  await receive(12, 3);
  expect(screen.getByTestId('hp')).toHaveTextContent('12');
  await act(async () => finish({ id: 'character', row_revision: 2, data: { ...character, currentHP: 19 } }));
  expect(screen.getByTestId('hp')).toHaveTextContent('12');
  expect(cloud.save).not.toHaveBeenCalled();
});

test('a failed command leaves confirmed HP unchanged', async () => {
  cloud.command.mockRejectedValue(new Error('Offline'));
  await openSheet();
  fireEvent.click(screen.getByText('Damage'));
  await flush();
  expect(screen.getByTestId('hp')).toHaveTextContent('20');
  expect(cloud.save).not.toHaveBeenCalled();
});

test('standalone local sheet applies cloud HP silently and uses commands for damage', async () => {
  await openLocalSheet();
  await receive(15, 1);
  expect(loadCharacter('character').currentHP).toBe(15);
  cloud.command.mockResolvedValue({ id: 'character', row_revision: 2, data: { ...character, currentHP: 14 } });
  fireEvent.click(screen.getByText('Damage'));
  await flush();
  expect(loadCharacter('character').currentHP).toBe(14);
  expect(cloud.push).not.toHaveBeenCalled();
  expect(cloud.command).toHaveBeenCalledOnce();
});

test('the first local damage click uses a command even before the first realtime row', async () => {
  await openLocalSheet();
  fireEvent.click(screen.getByText('Damage'));
  await flush();
  expect(cloud.command).toHaveBeenCalledWith('character', { type: 'modifyHp', delta: -1 });
  expect(cloud.push).not.toHaveBeenCalled();
});

test('characters excluded from cloud sync keep local HP editing', async () => {
  excludeFromSync('character');
  await openLocalSheet();
  expect(cloud.live.enabled).toBe(false);
  fireEvent.click(screen.getByText('Damage'));
  expect(loadCharacter('character').currentHP).toBe(19);
  expect(cloud.command).not.toHaveBeenCalled();
});

test('campaign-sheet?edit=1 receives GM damage despite a client clock ahead of the server', async () => {
  window.history.replaceState({}, '', '/campaign-sheet?id=character&edit=1');
  render(<CampaignSheetView />);
  await flush();
  await act(async () => cloud.receive({
    new: { id: 'character', data: character, updated_at: '2026-09-05T10:05:00Z' },
    commit_timestamp: '2026-09-05T10:00:00Z',
  }));
  await act(async () => cloud.receive({
    new: { id: 'character', data: { ...character, currentHP: 15 }, updated_at: '2026-09-05T10:00:01Z' },
    commit_timestamp: '2026-09-05T10:00:01Z',
  }));
  expect(screen.getByTestId('hp')).toHaveTextContent('15');
  expect(cloud.save).not.toHaveBeenCalled();
});

test('returning online recovers missed GM damage', async () => {
  render(<CampaignSheetView sheetId="character" editable />);
  await flush();
  cloud.get.mockResolvedValue({ id: 'character', row_revision: 2, data: { ...character, currentHP: 15 } });
  act(() => window.dispatchEvent(new Event('online')));
  await flush();
  expect(screen.getByTestId('hp')).toHaveTextContent('15');
  expect(cloud.command).not.toHaveBeenCalled();
});

test.each([true, false])('repeated damage stays stable through delayed echoes (embedded=%s)', async (embedded) => {
  render(<CampaignSheetView sheetId="character" editable embedded={embedded} />);
  await flush();
  for (let hit = 1; hit <= 3; hit += 1) {
    cloud.command.mockResolvedValue({ id: 'character', row_revision: hit, data: { ...character, currentHP: 20 - hit } });
    fireEvent.click(screen.getByText('Damage'));
    await flush();
    await receive(21 - hit, hit - 1);
    expect(screen.getByTestId('hp')).toHaveTextContent(String(20 - hit));
    expect(cloud.command).toHaveBeenCalledTimes(hit);
    expect(cloud.save).not.toHaveBeenCalled();
  }
});