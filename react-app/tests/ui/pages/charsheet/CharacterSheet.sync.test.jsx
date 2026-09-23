import { act, fireEvent, render, screen } from '@testing-library/react';
import CharacterSheet from '../../../../src/pages/charsheet/CharacterSheet.jsx';
import CampaignSheetView from '../../../../src/pages/campaignsheet/CampaignSheetView.jsx';
import CloudAutoSync from '../../../../src/shared/cloud/sync/CloudAutoSync.jsx';
import { loadCharacter, saveCharacter, setActiveCharId } from '../../../../src/shared/character/profile/store.js';
import { excludeFromSync } from '../../../../src/shared/cloud/sync/cloudSyncExclude.js';

const cloud = vi.hoisted(() => ({ save: vi.fn(), push: vi.fn(), get: vi.fn(), live: null, receive: null }));
vi.mock('../../../../src/shared/cloud/api/cloudCharacters.js', () => ({
  updateCloudCharacterData: cloud.save, pushCharacter: cloud.push, updateForeignCharacter: cloud.push,
  getCloudCharacter: cloud.get,
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
  cloud.push.mockReset().mockResolvedValue(undefined);
  cloud.get.mockReset().mockResolvedValue({ id: 'character', data: character, updated_at: '2026-09-05T10:05:00.000Z' });
  cloud.live = null;
  cloud.receive = null;
});
afterEach(() => { vi.useRealTimers(); window.history.replaceState({}, '', '/'); });

test('received encounter HP changes the sheet without scheduling another cloud write', async () => {
  const view = await openSheet();
  view.rerender(<CharacterSheet {...props} liveVitals={vitals(15)} />);
  expect(screen.getByTestId('hp')).toHaveTextContent('15');
  await flush();
  expect(cloud.save).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('Damage'));
  await flush();
  expect(cloud.save).toHaveBeenCalledTimes(1);
  expect(cloud.save).toHaveBeenLastCalledWith('character', expect.objectContaining({ currentHP: 14 }));
  view.rerender(<CharacterSheet {...props} liveVitals={vitals(14)} />);
  await flush();
  expect(cloud.save).toHaveBeenCalledTimes(1);
});

test('remote HP is merged into an already queued local notes save', async () => {
  const view = await openSheet();
  fireEvent.click(screen.getByText('Edit notes'));
  view.rerender(<CharacterSheet {...props} liveVitals={vitals(15)} />);
  await flush();
  expect(cloud.save).toHaveBeenCalledTimes(1);
  expect(cloud.save).toHaveBeenLastCalledWith('character', expect.objectContaining({ currentHP: 15, notes: 'Local note' }));
});

test('unsaved player damage survives an incoming older HP value', async () => {
  const view = await openSheet();
  fireEvent.click(screen.getByText('Damage'));
  view.rerender(<CharacterSheet {...props} liveVitals={vitals(20)} />);
  await flush();
  expect(screen.getByTestId('hp')).toHaveTextContent('19');
  expect(cloud.save).toHaveBeenCalledTimes(1);
  expect(cloud.save).toHaveBeenLastCalledWith('character', expect.objectContaining({ currentHP: 19 }));
});

test('incoming HP merges into the next local save while an earlier save is in flight', async () => {
  let finishSave;
  cloud.save.mockImplementationOnce(() => new Promise((resolve) => { finishSave = resolve; }));
  const view = await openSheet();
  fireEvent.click(screen.getByText('Edit notes'));
  await flush();
  fireEvent.click(screen.getByText('Edit notes'));
  view.rerender(<CharacterSheet {...props} liveVitals={vitals(15)} />);
  await act(async () => finishSave());
  await flush();
  expect(cloud.save).toHaveBeenCalledTimes(2);
  expect(cloud.save).toHaveBeenLastCalledWith('character', expect.objectContaining({ currentHP: 15, notes: 'Local note' }));
});

async function openLocalSheet() {
  saveCharacter('character', character, { emit: false });
  setActiveCharId('character');
  const view = render(<><CloudAutoSync /><CharacterSheet /></>);
  await flush();
  cloud.push.mockClear();
  expect(screen.getByTestId('hp')).toHaveTextContent('20');
  return view;
}

function receiveLocalVitals(currentHP) {
  act(() => cloud.live.onUpdate({ id: 'character', data: vitals(currentHP) }));
}

test('a standalone local sheet receives encounter HP and persists it without echoing to the cloud', async () => {
  await openLocalSheet();
  expect(cloud.live).toMatchObject({ charId: 'character', enabled: true });
  receiveLocalVitals(15);
  expect(screen.getByTestId('hp')).toHaveTextContent('15');
  expect(loadCharacter('character').currentHP).toBe(15);
  await flush();
  expect(cloud.push).not.toHaveBeenCalled();
  expect(cloud.save).not.toHaveBeenCalled();
});

test('a standalone local sheet keeps unsaved player HP and accepts GM changes after saving', async () => {
  await openLocalSheet();
  fireEvent.click(screen.getByText('Damage'));
  receiveLocalVitals(20);
  expect(screen.getByTestId('hp')).toHaveTextContent('19');
  await flush();
  expect(cloud.push).toHaveBeenCalledOnce();
  expect(loadCharacter('character').currentHP).toBe(19);
  receiveLocalVitals(15);
  expect(screen.getByTestId('hp')).toHaveTextContent('15');
  await flush();
  expect(cloud.push).toHaveBeenCalledOnce();
});

test('encounter HP merges with a queued local notes save', async () => {
  await openLocalSheet();
  cloud.push.mockImplementation(async (id) => {
    expect(loadCharacter(id)).toMatchObject({ currentHP: 15, notes: 'Local note' });
  });
  fireEvent.click(screen.getByText('Edit notes'));
  receiveLocalVitals(15);
  await flush();
  expect(cloud.push).toHaveBeenCalledOnce();
});

test('completion of an older local save cannot release HP still being saved', async () => {
  await openLocalSheet();
  let finishFirst;
  let finishSecond;
  cloud.push
    .mockImplementationOnce(() => new Promise((resolve) => { finishFirst = resolve; }))
    .mockImplementationOnce(() => new Promise((resolve) => { finishSecond = resolve; }));
  fireEvent.click(screen.getByText('Damage'));
  await flush();
  fireEvent.click(screen.getByText('Damage'));
  await flush();
  await act(async () => finishFirst());
  receiveLocalVitals(19);
  expect(screen.getByTestId('hp')).toHaveTextContent('18');
  await act(async () => finishSecond());
  receiveLocalVitals(15);
  expect(screen.getByTestId('hp')).toHaveTextContent('15');
});

test('characters explicitly excluded from cloud sync do not subscribe', async () => {
  excludeFromSync('character');
  await openLocalSheet();
  expect(cloud.live.enabled).toBe(false);
});

test('an online standalone sheet also applies vitals received before initialization finishes', async () => {
  render(<CharacterSheet {...props} embedded={false} liveVitals={vitals(15)} />);
  await flush();
  expect(screen.getByTestId('hp')).toHaveTextContent('15');
  expect(cloud.save).not.toHaveBeenCalled();
  expect(cloud.live.enabled).toBe(false);
});

test('campaign-sheet?edit=1 receives GM damage after a player save with an ahead-of-server clock', async () => {
  window.history.replaceState({}, '', '/campaign-sheet?id=character&edit=1');
  render(<CampaignSheetView />);
  await flush();
  expect(screen.getByTestId('hp')).toHaveTextContent('20');
  act(() => cloud.receive({
    new: { id: 'character', data: character, updated_at: '2026-09-05T10:05:00.000Z' },
    commit_timestamp: '2026-09-05T10:00:00.000Z',
  }));
  act(() => cloud.receive({
    new: { id: 'character', data: { ...character, currentHP: 15 }, updated_at: '2026-09-05T10:00:01.000Z' },
    commit_timestamp: '2026-09-05T10:00:01.000Z',
  }));
  expect(screen.getByTestId('hp')).toHaveTextContent('15');
  await flush();
  expect(cloud.save).not.toHaveBeenCalled();
});

test('returning to the online sheet recovers missed GM damage despite clock differences', async () => {
  window.history.replaceState({}, '', '/campaign-sheet?id=character&edit=1');
  render(<CampaignSheetView />);
  await flush();
  act(() => cloud.receive({
    new: { id: 'character', data: character, updated_at: '2026-09-05T10:05:00.000Z' },
    commit_timestamp: '2026-09-05T10:00:00.000Z',
  }));
  cloud.get.mockResolvedValue({
    id: 'character', data: { ...character, currentHP: 15 }, updated_at: '2026-09-05T10:00:01.000Z',
  });
  act(() => window.dispatchEvent(new Event('focus')));
  await flush();
  expect(screen.getByTestId('hp')).toHaveTextContent('15');
  expect(cloud.save).not.toHaveBeenCalled();
});
