import { act, fireEvent, render, screen } from '@testing-library/react';
import CharacterSheet from '../../../../src/pages/charsheet/CharacterSheet.jsx';
import CampaignSheetView from '../../../../src/pages/campaignsheet/CampaignSheetView.jsx';
import CloudAutoSync from '../../../../src/shared/cloud/sync/CloudAutoSync.jsx';
import {
  getCharacterSyncMeta, loadCharacter, markCharacterSynced, saveCharacter, setActiveCharId,
} from '../../../../src/shared/character/profile/store.js';
import { excludeFromSync } from '../../../../src/shared/cloud/sync/cloudSyncExclude.js';
import { publishCharacterSheetSaved, publishCharacterVitals } from '../../../../src/shared/cloud/sync/characterEvents.js';
import { healthCommandRoute } from '../../../../src/shared/cloud/api/healthCommandRoute.js';
import { toCharacterDigest } from '../../../../src/shared/campaign/characterDigest.js';

// Every sheet takes vitals from others through the character digest, and
// learns that its content changed through its sheet revision
// (character_sheet_revisions). No sheet subscribes to or polls `characters`.

const cloud = vi.hoisted(() => ({
  save: vi.fn(), command: vi.fn(), push: vi.fn(), get: vi.fn(), revision: vi.fn(), list: vi.fn(), sheets: vi.fn(),
  channels: [], digestRows: [], sheetRevision: 0,
}));
vi.mock('../../../../src/shared/cloud/api/cloudCharacters.js', () => ({
  updateCloudCharacterData: cloud.save, pushCharacter: cloud.push, updateForeignCharacter: cloud.push,
  getCloudCharacter: cloud.get, getCloudSheetRevision: cloud.revision, commandCharacterVitals: cloud.command,
  SHEET_CONFLICT: 'SHEET_CONFLICT',
}));
vi.mock('../../../../src/shared/cloud/api/characterDigests.js', async (original) => ({
  ...await original(),
  listCharacterDigests: (...args) => cloud.list(...args),
  readCharacterSheets: (...args) => cloud.sheets(...args),
}));
vi.mock('../../../../src/shared/cloud/auth/AuthProvider.jsx', () => ({
  useAuth: () => ({ cloudEnabled: true, status: 'authed', user: { id: 'owner' } }),
}));
vi.mock('../../../../src/shared/cloud/supabaseClient.js', () => ({
  supabase: {
    channel: (topic) => {
      const channel = {
        topic,
        on(_event, filter, receive) { this.table = filter.table; this.receive = receive; return this; },
        subscribe(status) { this.status = status; return this; },
      };
      cloud.channels.push(channel);
      return channel;
    },
    removeChannel: vi.fn(),
  },
}));
vi.mock('../../../../src/shared/cloud/sync/useRollChannel.js', () => ({ useRollChannel: () => ({ publish: vi.fn() }) }));
vi.mock('../../../../src/shared/cloud/sync/useCharacterCampaign.js', () => ({ useCharacterCampaign: () => null }));
vi.mock('../../../../src/pages/charsheet/state/sheetRuntimeAdapters.js', () => ({ ensureSheetRuntimeAdapters: async () => {} }));
vi.mock('../../../../src/pages/charbuilder/data/dataLoaders.js', () => ({
  loadItems: async () => [], loadOptionalFeatures: async () => [], loadConditions: async () => ({}),
  reconcileInventoryWithItemsDb: (inventory) => inventory,
}));
vi.mock('../../../../src/pages/charsheet/resources/HPBlock.jsx', () => ({ default: ({ sheet, onDamage }) => (
  <>
    <output data-testid="hp">{sheet.currentHP}</output>
    <output data-testid="max">{sheet.maxHP}</output>
    <button onClick={() => onDamage(1)}>Damage</button>
  </>
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
  return { default: ({ C }) => {
    const actions = useSheetActions();
    return <>
      <output data-testid="notes">{C?.notes || ''}</output>
      <output data-testid="items">{(C?.inventory || []).map((item) => item.name).join(',')}</output>
      <button onClick={() => actions.onUpdateNotes('Local note')}>Edit notes</button>
    </>;
  } };
});

const character = {
  name: 'Fighter', className: 'Fighter', level: 5, clsSnapshot: { hd: { faces: 10 } },
  finalScores: { str: 10, dex: 10, con: 14, int: 10, wis: 10, cha: 10 },
  currentHP: 20, tempHP: 0, maxHPBonus: 0, deathSaves: { success: 0, fail: 0 }, activeConditions: [],
};
const props = { externalChar: character, externalCharId: 'character', externalSheetRevision: 0, embedded: true };
const digestRow = (revision, patch = {}) => ({
  character_id: 'character', campaign_id: 'camp', owner: 'owner', row_revision: revision,
  digest: {
    name: 'Fighter', currentHP: 20, tempHP: 0, maxHPBonus: 0, deathSaves: { success: 0, fail: 0 },
    activeConditions: [], hpBasis: 'h1', ...patch,
  },
});
const sheetRow = (revision, currentHP, sheetRevision = 0, data = {}) => ({
  id: 'character', row_revision: revision, sheet_revision: sheetRevision, data: { ...character, currentHP, ...data },
});
// What commit_character_vitals answers: vitals, digest revision, basis.
const vitalsAnswer = (revision, currentHP) => ({
  applied: true, characterId: 'character', digestRevision: revision, hpBasis: 'h1',
  vitals: { currentHP, tempHP: 0, maxHPBonus: 0, deathSaves: { success: 0, fail: 0 }, activeConditions: [] },
});
// A health command publishes its answer (commandCharacterVitals), after a
// network round trip.
const answer = (result) => async () => {
  await new Promise((resolve) => { setTimeout(resolve, 100); });
  publishCharacterVitals(result);
  return result;
};
// The route each command took: the normal path reads nothing first.
const routes = () => cloud.command.mock.calls.map(([id, command, context]) => healthCommandRoute(id, command, context));

async function flush() { await act(async () => { await vi.advanceTimersByTimeAsync(1500); }); }
async function openSheet(extra = {}) {
  const view = render(<CharacterSheet {...props} {...extra} />);
  await flush();
  expect(screen.getByTestId('hp')).toHaveTextContent('20');
  return view;
}
const digestChannels = () => cloud.channels.filter((channel) => channel.table === 'character_digests');
const rowChannels = () => cloud.channels.filter((channel) => channel.table === 'characters');
const sheetChannels = () => cloud.channels.filter((channel) => channel.table === 'character_sheet_revisions');
// Someone else saves the sheet's content: the database moves sheet_revision
// and character_sheet_revisions announces it.
async function remoteSheetChange(sheetRevision, data) {
  cloud.sheetRevision = sheetRevision;
  cloud.get.mockResolvedValue(sheetRow(9, 20, sheetRevision, data));
  await act(async () => sheetChannels().at(-1).receive({
    eventType: 'UPDATE', new: { character_id: 'character', sheet_revision: sheetRevision },
  }));
  await flush();
}
const fullReads = (reason) => cloud.get.mock.calls.filter(([, options]) => !reason || options?.reason === reason).length;
async function receive(currentHP, revision, patch = {}) {
  const row = digestRow(revision, { currentHP, ...patch });
  await act(async () => digestChannels().at(-1).receive({ eventType: 'UPDATE', new: row }));
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  cloud.channels = [];
  cloud.digestRows = [digestRow(0)];
  cloud.sheetRevision = 0;
  cloud.save.mockReset().mockImplementation(async () => {
    cloud.sheetRevision += 1;
    return { id: 'character', sheetRevision: cloud.sheetRevision };
  });
  cloud.command.mockReset().mockImplementation(answer(vitalsAnswer(1, 19)));
  // CloudAutoSync's push of a local sheet, as pushCharacter does it.
  cloud.push.mockReset().mockImplementation(async (id) => {
    cloud.sheetRevision += 1;
    markCharacterSynced(id, cloud.sheetRevision);
    publishCharacterSheetSaved(id, cloud.sheetRevision);
  });
  cloud.get.mockReset().mockResolvedValue(sheetRow(0, 20));
  cloud.revision.mockReset().mockImplementation(async () => cloud.sheetRevision);
  cloud.list.mockReset().mockImplementation(async () => cloud.digestRows.map(toCharacterDigest));
  cloud.sheets.mockReset().mockResolvedValue([]);
});
afterEach(() => { vi.useRealTimers(); window.history.replaceState({}, '', '/'); });

async function openLocalSheet() {
  saveCharacter('character', character, { emit: false });
  setActiveCharId('character');
  render(<><CloudAutoSync /><CharacterSheet /></>);
  await flush();
  cloud.push.mockClear();
}

test.each([true, false])('embedded=%s reads HP from the digest and sends damage as an intent', async (embedded) => {
  render(<CharacterSheet {...props} embedded={embedded} />);
  await flush();
  await receive(15, 1);
  expect(screen.getByTestId('hp')).toHaveTextContent('15');
  cloud.command.mockImplementation(answer(vitalsAnswer(2, 14)));
  fireEvent.click(screen.getByText('Damage'));
  expect(screen.getByTestId('hp')).toHaveTextContent('15');
  await flush();
  expect(cloud.command).toHaveBeenCalledWith('character', { type: 'modifyHp', delta: -1 }, expect.anything());
  expect(routes()).toEqual(['digest']);
  // The base max is this sheet's own, for the basis of the digest it follows.
  expect(cloud.command.mock.calls[0][2].base).toEqual({ hpBasis: 'h1', baseMax: Number(screen.getByTestId('max').textContent) });
  expect(cloud.get).not.toHaveBeenCalled();
  expect(screen.getByTestId('hp')).toHaveTextContent('14');
  await receive(20, 0);
  expect(screen.getByTestId('hp')).toHaveTextContent('14');
  expect(cloud.save).not.toHaveBeenCalled();
});

test('an editable sheet opens one digest channel and never touches the characters row', async () => {
  await openSheet();
  expect(digestChannels()).toHaveLength(1);
  expect(rowChannels()).toHaveLength(0);
  expect(cloud.sheets).not.toHaveBeenCalled();
  expect(cloud.get).not.toHaveBeenCalled();
  expect(cloud.revision).not.toHaveBeenCalled();
});

test('idle: several safety ticks read only the digest, never the sheet', async () => {
  await openSheet();
  const listed = cloud.list.mock.calls.length;
  await act(async () => { await vi.advanceTimersByTimeAsync(5 * 30_000); });
  expect(cloud.list.mock.calls.length - listed).toBe(5);
  expect(cloud.get).not.toHaveBeenCalled();
  expect(cloud.revision).not.toHaveBeenCalled();
  expect(cloud.sheets).not.toHaveBeenCalled();
  expect(screen.getByTestId('hp')).toHaveTextContent('20');
});

test('a digest handed down by the parent feeds the sheet; it opens no digest channel of its own', async () => {
  const view = await openSheet({ liveDigest: toCharacterDigest(digestRow(0)) });
  expect(digestChannels()).toHaveLength(0);
  expect(sheetChannels()).toHaveLength(1);
  view.rerender(<CharacterSheet {...props} liveDigest={toCharacterDigest(digestRow(3, { currentHP: 11 }))} />);
  await flush();
  expect(screen.getByTestId('hp')).toHaveTextContent('11');
  // Another character's digest is never applied.
  view.rerender(<CharacterSheet {...props} liveDigest={{ ...toCharacterDigest(digestRow(4, { currentHP: 2 })), characterId: 'other' }} />);
  await flush();
  expect(screen.getByTestId('hp')).toHaveTextContent('11');
  expect(cloud.list).not.toHaveBeenCalled();
  expect(cloud.save).not.toHaveBeenCalled();
});

test('a digest received before the sheet initialises is applied without writing it back', async () => {
  render(<CharacterSheet {...props} embedded={false} liveDigest={toCharacterDigest(digestRow(1, { currentHP: 15 }))} />);
  await flush();
  expect(screen.getByTestId('hp')).toHaveTextContent('15');
  expect(cloud.save).not.toHaveBeenCalled();
  expect(cloud.command).not.toHaveBeenCalled();
});

test('max HP follows the synced bonus on top of this sheet, with no sheet download', async () => {
  await openSheet();
  const base = Number(screen.getByTestId('max').textContent);
  await receive(null, 1, { maxHPBonus: 5 });
  expect(screen.getByTestId('max')).toHaveTextContent(String(base + 5));
  // No current HP in the digest means undamaged.
  expect(screen.getByTestId('hp')).toHaveTextContent(String(base + 5));
  await receive(12, 2, { maxHPBonus: 5, hpBasis: 'h2' });
  expect(screen.getByTestId('hp')).toHaveTextContent('12');
  expect(cloud.sheets).not.toHaveBeenCalled();
  expect(cloud.get).not.toHaveBeenCalled();
});

test('remote damage and local notes share a sheet without sending a health command', async () => {
  await openSheet();
  fireEvent.click(screen.getByText('Edit notes'));
  await receive(15, 1);
  await flush();
  expect(cloud.save).toHaveBeenCalledWith(
    'character', expect.objectContaining({ currentHP: 15, notes: 'Local note' }), { expectedSheetRevision: 0 },
  );
  expect(cloud.command).not.toHaveBeenCalled();
});

test('a pending damage command accepts GM updates; an older acknowledgement cannot overwrite them', async () => {
  let finish;
  cloud.command.mockImplementationOnce(() => new Promise((resolve) => {
    finish = (result) => { publishCharacterVitals(result); resolve(result); };
  }));
  await openSheet();
  fireEvent.click(screen.getByText('Damage'));
  await receive(12, 3);
  expect(screen.getByTestId('hp')).toHaveTextContent('12');
  await act(async () => finish(vitalsAnswer(2, 19)));
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
  cloud.command.mockImplementation(answer(vitalsAnswer(2, 14)));
  fireEvent.click(screen.getByText('Damage'));
  await flush();
  expect(loadCharacter('character').currentHP).toBe(14);
  expect(cloud.push).not.toHaveBeenCalled();
  expect(cloud.command).toHaveBeenCalledOnce();
  expect(routes()).toEqual(['digest']);
  expect(rowChannels()).toHaveLength(0);
  expect(cloud.get).not.toHaveBeenCalled();
});

test('the first local damage click uses a command even before the first digest', async () => {
  cloud.list.mockImplementation(() => new Promise(() => {}));
  await openLocalSheet();
  fireEvent.click(screen.getByText('Damage'));
  await flush();
  expect(cloud.command).toHaveBeenCalledWith('character', { type: 'modifyHp', delta: -1 }, { digest: null, base: null });
  // With no digest yet, the command itself takes the rare path that reads the sheet.
  expect(routes()).toEqual(['no-digest']);
  expect(cloud.push).not.toHaveBeenCalled();
});

test('characters excluded from cloud sync keep local HP editing and follow nothing', async () => {
  excludeFromSync('character');
  await openLocalSheet();
  expect(digestChannels()).toHaveLength(0);
  fireEvent.click(screen.getByText('Damage'));
  expect(loadCharacter('character').currentHP).toBe(19);
  expect(cloud.command).not.toHaveBeenCalled();
});

test('campaign-sheet?edit=1 reads the row once and receives GM damage through the digest', async () => {
  window.history.replaceState({}, '', '/campaign-sheet?id=character&edit=1');
  render(<CampaignSheetView />);
  await flush();
  // SUBSCRIBED on the digest channel: a digest read, not another sheet.
  await act(async () => digestChannels().at(-1).status('SUBSCRIBED'));
  await receive(15, 1);
  expect(screen.getByTestId('hp')).toHaveTextContent('15');
  await act(async () => { await vi.advanceTimersByTimeAsync(3 * 30_000); });
  expect(cloud.get).toHaveBeenCalledOnce();
  expect(cloud.revision).not.toHaveBeenCalled();
  expect(rowChannels()).toHaveLength(0);
  expect(cloud.save).not.toHaveBeenCalled();
});

test('damage missed while offline is recovered when the tab comes back online', async () => {
  render(<CampaignSheetView sheetId="character" editable />);
  await flush();
  cloud.digestRows = [digestRow(2, { currentHP: 15 })];
  act(() => window.dispatchEvent(new Event('online')));
  await flush();
  expect(screen.getByTestId('hp')).toHaveTextContent('15');
  expect(cloud.get).toHaveBeenCalledOnce();
  expect(cloud.command).not.toHaveBeenCalled();
});

test('damage missed during a disconnect is recovered when realtime resubscribes', async () => {
  await openSheet();
  cloud.digestRows = [digestRow(4, { currentHP: 9, activeConditions: ['prone'] })];
  await act(async () => digestChannels().at(-1).status('SUBSCRIBED'));
  await flush();
  expect(screen.getByTestId('hp')).toHaveTextContent('9');
  expect(cloud.get).not.toHaveBeenCalled();
});

test.each([true, false])('repeated damage stays stable through delayed echoes (embedded=%s)', async (embedded) => {
  render(<CampaignSheetView sheetId="character" editable embedded={embedded} />);
  await flush();
  for (let hit = 1; hit <= 3; hit += 1) {
    cloud.command.mockImplementation(answer(vitalsAnswer(hit, 20 - hit)));
    fireEvent.click(screen.getByText('Damage'));
    await flush();
    await receive(21 - hit, hit - 1);
    expect(screen.getByTestId('hp')).toHaveTextContent(String(20 - hit));
    expect(cloud.command).toHaveBeenCalledTimes(hit);
    expect(cloud.save).not.toHaveBeenCalled();
  }
  expect(routes()).toEqual(['digest', 'digest', 'digest']);
  expect(cloud.get).toHaveBeenCalledOnce();
});


describe('content changed elsewhere (sheet revision)', () => {
  test('no sheet subscribes to characters; each opens one sheet-revision channel', async () => {
    await openSheet();
    expect(rowChannels()).toHaveLength(0);
    expect(sheetChannels()).toHaveLength(1);
  });

  test('editable, clean: a GM inventory change is one light event and one download', async () => {
    render(<CampaignSheetView sheetId="character" editable embedded />);
    await flush();
    expect(fullReads()).toBe(1); // the initial load
    await remoteSheetChange(1, { inventory: [{ name: 'Rope' }] });
    expect(screen.getByTestId('items')).toHaveTextContent('Rope');
    expect(fullReads('structural-refresh')).toBe(1);
    expect(cloud.save).not.toHaveBeenCalled(); // the applied row is not written back
    // The same revision seen again by a recovery read is not downloaded twice.
    act(() => window.dispatchEvent(new Event('online')));
    await flush();
    expect(fullReads('structural-refresh')).toBe(1);
  });

  test('editable, dirty: a GM change while a save is pending is never overwritten; the user decides', async () => {
    render(<CampaignSheetView sheetId="character" editable embedded />);
    await flush();
    fireEvent.click(screen.getByText('Edit notes')); // pending save (1.2 s debounce)
    // The GM saves first: the pending save is based on revision 0.
    cloud.sheetRevision = 1;
    cloud.get.mockResolvedValue(sheetRow(9, 20, 1, { inventory: [{ name: 'Rope' }] }));
    cloud.save.mockImplementation(async (_id, _data, { expectedSheetRevision }) => {
      if (expectedSheetRevision !== cloud.sheetRevision) {
        throw Object.assign(new Error('changed elsewhere'), { code: 'SHEET_CONFLICT', remoteSheetRevision: cloud.sheetRevision });
      }
      cloud.sheetRevision += 1;
      return { id: 'character', sheetRevision: cloud.sheetRevision };
    });
    await act(async () => sheetChannels().at(-1).receive({
      eventType: 'UPDATE', new: { character_id: 'character', sheet_revision: 1 },
    }));
    await flush();
    expect(cloud.save).toHaveBeenCalledWith('character', expect.objectContaining({ notes: 'Local note' }), { expectedSheetRevision: 0 });
    await flush();
    expect(screen.getByText(/updated elsewhere/i)).toBeInTheDocument();
    expect(fullReads('conflict-refresh')).toBe(1);
    expect(fullReads('structural-refresh')).toBe(0);
    expect(screen.getByTestId('notes')).toHaveTextContent('Local note'); // local version kept meanwhile
    expect(screen.getByTestId('items')).toHaveTextContent('');

    // "Keep my changes": an explicit save over revision 1, still conditional.
    fireEvent.click(screen.getByText('Keep my changes'));
    await flush();
    expect(cloud.save).toHaveBeenLastCalledWith('character', expect.objectContaining({ notes: 'Local note' }), { expectedSheetRevision: 1 });
    expect(screen.queryByText(/updated elsewhere/i)).toBeNull();
  });

  test('dirty, then "Load updated version" drops the local change for the cloud one', async () => {
    render(<CampaignSheetView sheetId="character" editable embedded />);
    await flush();
    cloud.save.mockRejectedValue(Object.assign(new Error('changed elsewhere'), { code: 'SHEET_CONFLICT', remoteSheetRevision: 1 }));
    cloud.get.mockResolvedValue(sheetRow(9, 20, 1, { notes: 'GM note', inventory: [{ name: 'Rope' }] }));
    fireEvent.click(screen.getByText('Edit notes'));
    await flush();
    await flush();
    fireEvent.click(screen.getByText('Load updated version'));
    await flush();
    expect(screen.getByTestId('notes')).toHaveTextContent('GM note');
    expect(screen.getByTestId('items')).toHaveTextContent('Rope');
    expect(cloud.save).toHaveBeenCalledTimes(1);
  });

  test('three health commands: digest only, no sheet event, no download', async () => {
    render(<CampaignSheetView sheetId="character" editable embedded />);
    await flush();
    for (let hit = 1; hit <= 3; hit += 1) {
      cloud.command.mockImplementation(answer(vitalsAnswer(hit, 20 - hit)));
      fireEvent.click(screen.getByText('Damage'));
      await flush();
      await receive(20 - hit, hit);
    }
    expect(screen.getByTestId('hp')).toHaveTextContent('17');
    expect(fullReads()).toBe(1);
  });

  test('own save: its echo is ignored, whether it arrives before or after the answer', async () => {
    render(<CampaignSheetView sheetId="character" editable embedded />);
    await flush();
    let finish;
    cloud.save.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    fireEvent.click(screen.getByText('Edit notes'));
    await flush(); // the save is in flight
    await act(async () => sheetChannels().at(-1).receive({
      eventType: 'UPDATE', new: { character_id: 'character', sheet_revision: 1 },
    })); // its echo first
    await act(async () => finish({ id: 'character', sheetRevision: 1 }));
    await flush();
    expect(fullReads()).toBe(1);
    await act(async () => sheetChannels().at(-1).receive({
      eventType: 'UPDATE', new: { character_id: 'character', sheet_revision: 1 },
    })); // and again after
    await flush();
    expect(fullReads()).toBe(1);
  });

  test('read-only viewer: HP through the digest with no download; content through one download', async () => {
    window.history.replaceState({}, '', '/campaign-sheet?id=character');
    render(<CampaignSheetView />);
    await flush();
    expect(rowChannels()).toHaveLength(0);
    expect(digestChannels()).toHaveLength(1);
    await receive(11, 3);
    expect(screen.getByTestId('hp')).toHaveTextContent('11');
    expect(fullReads()).toBe(1);
    await remoteSheetChange(2, { inventory: [{ name: 'Rope' }], currentHP: 11 });
    expect(screen.getByTestId('items')).toHaveTextContent('Rope');
    expect(fullReads('structural-refresh')).toBe(1);
    expect(cloud.save).not.toHaveBeenCalled();
    expect(cloud.command).not.toHaveBeenCalled();
  });

  test('a deleted character empties a cloud view', async () => {
    render(<CampaignSheetView sheetId="character" editable embedded />);
    await flush();
    await act(async () => sheetChannels().at(-1).receive({ eventType: 'DELETE', old: { character_id: 'character' } }));
    expect(screen.getByText('This sheet no longer exists.')).toBeInTheDocument();
  });
});

describe('standalone local sheet', () => {
  test('a change made while it was closed is recovered on open, stored as the cloud copy, not pushed back', async () => {
    saveCharacter('character', character, { emit: false });
    markCharacterSynced('character', 2);
    setActiveCharId('character');
    cloud.sheetRevision = 3; // the GM added an item while this copy was closed
    cloud.get.mockResolvedValue(sheetRow(9, 20, 3, { inventory: [{ name: 'Rope' }] }));
    render(<><CloudAutoSync /><CharacterSheet /></>);
    await flush();
    await act(async () => sheetChannels().at(-1).status('SUBSCRIBED'));
    await flush();
    expect(fullReads('structural-refresh')).toBe(1);
    expect(screen.getByTestId('items')).toHaveTextContent('Rope');
    expect(loadCharacter('character').inventory).toEqual([{ name: 'Rope' }]);
    expect(getCharacterSyncMeta('character').sheetRevision).toBe(3);
    await flush();
    expect(cloud.push).not.toHaveBeenCalled();
  });

  test('its own pushes are recognised: editing notes downloads nothing', async () => {
    await openLocalSheet();
    fireEvent.click(screen.getByText('Edit notes'));
    await flush(); // CloudAutoSync pushes: sheet_revision 1, announced
    expect(cloud.push).toHaveBeenCalledOnce();
    await act(async () => sheetChannels().at(-1).receive({
      eventType: 'UPDATE', new: { character_id: 'character', sheet_revision: cloud.sheetRevision },
    }));
    await flush();
    expect(fullReads()).toBe(0);
  });
});

test('standalone, dirty: an autosync push refused by a newer cloud sheet asks the user, and nothing is overwritten', async () => {
  await openLocalSheet();
  cloud.push.mockRejectedValueOnce(Object.assign(new Error('changed elsewhere'), { code: 'SHEET_CONFLICT', remoteSheetRevision: 4 }));
  cloud.get.mockResolvedValue(sheetRow(9, 20, 4, { notes: 'GM note' }));
  fireEvent.click(screen.getByText('Edit notes'));
  await flush(); // push → conflict
  await flush();
  expect(screen.getByText(/updated elsewhere/i)).toBeInTheDocument();
  expect(fullReads('conflict-refresh')).toBe(1);
  expect(loadCharacter('character').notes).toBe('Local note'); // the local copy is kept until the user decides
  fireEvent.click(screen.getByText('Load updated version'));
  await flush();
  expect(screen.getByTestId('notes')).toHaveTextContent('GM note');
  expect(loadCharacter('character').notes).toBe('GM note');
  expect(getCharacterSyncMeta('character').sheetRevision).toBe(4);
  await flush();
  expect(cloud.push).toHaveBeenCalledTimes(1); // the cloud copy is not pushed back
});

test('standalone: an edit during a push waits for it; the echo of the first push downloads nothing and no conflict appears', async () => {
  await openLocalSheet();
  let finishFirst;
  cloud.push.mockImplementationOnce((id) => new Promise((resolve) => {
    finishFirst = () => {
      cloud.sheetRevision += 1;
      markCharacterSynced(id, cloud.sheetRevision);
      publishCharacterSheetSaved(id, cloud.sheetRevision);
      resolve();
    };
  }));
  fireEvent.click(screen.getByText('Edit notes'));
  await flush(); // push A is on its way
  expect(cloud.push).toHaveBeenCalledTimes(1);
  // Edit again while A runs: no second push yet.
  saveCharacter('character', { ...loadCharacter('character'), notes: 'Later note' });
  await flush();
  expect(cloud.push).toHaveBeenCalledTimes(1);
  // A's echo arrives before its answer, then A answers.
  await act(async () => sheetChannels().at(-1).receive({
    eventType: 'UPDATE', new: { character_id: 'character', sheet_revision: 1 },
  }));
  await act(async () => finishFirst());
  await flush(); // B: scheduled after A, pushed from the latest copy
  expect(cloud.push).toHaveBeenCalledTimes(2);
  expect(getCharacterSyncMeta('character').sheetRevision).toBe(2);
  expect(fullReads()).toBe(0);
  expect(screen.queryByText(/updated elsewhere/i)).toBeNull();
});
