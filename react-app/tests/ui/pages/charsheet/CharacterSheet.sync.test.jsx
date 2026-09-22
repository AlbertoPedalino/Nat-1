import { act, fireEvent, render, screen } from '@testing-library/react';
import CharacterSheet from '../../../../src/pages/charsheet/CharacterSheet.jsx';

const cloud = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock('../../../../src/shared/cloud/api/cloudCharacters.js', () => ({ updateCloudCharacterData: cloud.save }));
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
beforeEach(() => { vi.useFakeTimers(); cloud.save.mockReset().mockResolvedValue(undefined); });
afterEach(() => { vi.useRealTimers(); });

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
