import { act, render, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { beforeEach, vi } from 'vitest';
import { theme } from '../../../../../src/app/theme.js';
import SceneEditor from '../../../../../src/pages/vtt/scene/SceneEditor.jsx';
import { persistFights } from '../../../../../src/pages/encounterbuilder/state/storage.js';
import { createInstance } from '../../../../../src/shared/instances/instanceStore.js';
import { healthCommandRoute } from '../../../../../src/shared/cloud/api/healthCommandRoute.js';

const m = vi.hoisted(() => ({
  commit: vi.fn(),
  updateToken: vi.fn(),
  setTokenConditions: vi.fn(),
  setTokenEffects: vi.fn(),
  refreshVisibleTokens: vi.fn(),
  notify: vi.fn(),
  menu: { current: null },
  viewport: { current: null },
  setTokenHp: vi.fn(),
  secretHp: { current: {} },
  fightRows: { current: [] },
  isGm: { current: true },
  tokens: { current: [] },
  characterCommand: vi.fn(),
  roster: { current: null },
}));

vi.mock('../../../../../src/shared/cloud/api/encounterFights.js', () => ({
  FIGHT_UNAVAILABLE: 'FIGHT_UNAVAILABLE',
  commitFightCombatantVitals: (...args) => m.commit(...args),
  listFightVitals: async () => m.fightRows.current,
  listFightRevisions: async () => m.fightRows.current.map((row) => ({ id: row.id, updated_at: row.updated_at })),
  saveInstanceFight: vi.fn(),
}));
vi.mock('../../../../../src/shared/cloud/api/vtt.js', async (importOriginal) => ({
  ...await importOriginal(),
  signMapImage: vi.fn(async () => null),
  updateScene: vi.fn(async () => null),
  fetchScene: vi.fn(async () => null),
  updateToken: (...args) => m.updateToken(...args),
  setTokenConditions: (...args) => m.setTokenConditions(...args),
  setTokenEffects: (...args) => m.setTokenEffects(...args),
  setTokenSecret: vi.fn(async () => null),
  setTokenHp: (...args) => m.setTokenHp(...args),
  listTokenSecretHp: async () => m.secretHp.current,
}));
vi.mock('../../../../../src/shared/cloud/api/cloudCharacters.js', () => ({
  commandCharacterVitals: (...args) => m.characterCommand(...args),
}));
vi.mock('../../../../../src/shared/ui/ToastProvider.jsx', () => ({ useToast: () => ({ notify: m.notify }) }));
vi.mock('../../../../../src/shared/cloud/auth/AuthProvider.jsx', () => ({ useAuth: () => ({ user: { id: 'gm-1' } }) }));
vi.mock('../../../../../src/shared/vtt/session/useSceneRole.js', () => ({
  useSceneRole: () => ({ campaignName: 'C', gmId: 'gm-1', isGm: m.isGm.current, loading: false, ownedCharacterIds: [] }),
}));
vi.mock('../../../../../src/shared/vtt/session/useSceneLive.js', () => ({
  useSceneLive: () => ({
    sendCamera: vi.fn(), sendDrag: vi.fn(), sendPresenterInspection: vi.fn(), sendPresenterState: vi.fn(),
  }),
}));
vi.mock('../../../../../src/shared/character/profile/usePortraits.js', () => ({ usePortraits: () => ({}) }));
vi.mock('../../../../../src/pages/encounterbuilder/bestiary/useMonsterDb.js', () => ({ useMonsterDb: () => ({ monsters: [] }) }));
vi.mock('../../../../../src/pages/encounterbuilder/combat/useConditionEntries.js', () => ({ useConditionEntries: () => [] }));
vi.mock('../../../../../src/pages/vtt/dungeon/useSceneDungeon.js', () => ({
  useSceneDungeon: () => ({ fights: [], monstersForRoom: () => [], markersForRoom: () => [] }),
}));
vi.mock('../../../../../src/pages/vtt/hexcrawl/useSceneHexcrawl.js', () => ({
  useSceneHexcrawl: () => ({ visible: false, cellsByKey: new Map(), partyHex: null }),
}));
vi.mock('../../../../../src/pages/vtt/rolls/useVttRolls.js', () => ({
  useVttRolls: () => ({
    clearFeed: vi.fn(), diceThrows: [], dismissToast: vi.fn(), feed: [], handleCustomRoll: vi.fn(),
    handleSheetRoll: vi.fn(), rollBubbles: [], toast: null,
  }),
}));
vi.mock('../../../../../src/pages/vtt/scene/useCampaignRoster.js', () => ({
  useCampaignRoster: () => m.roster.current || { roster: [], digests: new Map(), baseMax: new Map() },
}));
vi.mock('../../../../../src/pages/vtt/scene/useSceneContent.js', () => ({
  useSceneContent: () => ({
    beginTokenMove: () => () => {},
    drawings: [],
    handleDrawingEvent: vi.fn(),
    loading: false,
    refreshVisibleTokens: m.refreshVisibleTokens,
    reconcileContent: vi.fn(async () => {}),
    refreshContent: vi.fn(async () => {}),
    setDrawings: vi.fn(),
    setTokens: vi.fn(),
    tokenImageUrls: {},
    tokens: m.tokens.current,
  }),
}));
vi.mock('../../../../../src/pages/vtt/map/SceneViewport.jsx', () => ({
  default: (props) => {
    m.viewport.current = props;
    if (props.onContextMenu) m.viewport.menuOpener = props.onContextMenu;
    return <div data-testid="scene-viewport" />;
  },
}));
vi.mock('../../../../../src/pages/vtt/tokens/TokenMenu.jsx', () => ({
  default: (props) => { m.menu.current = props; return null; },
}));
vi.mock('../../../../../src/pages/campaignsheet/CampaignSheetView.jsx', () => ({ default: () => null }));

const OGRE = {
  id: 'ogre-piece', layer: 'tokens', x: 1, y: 1, label: 'Ogre', sourceRef: 'enc_a:77:0',
  hpCurrent: 30, hpMax: 59, conditions: [], effects: [], showHp: true,
};

function mountEditor() {
  render(<ThemeProvider theme={theme}><SceneEditor scene={{
    id: 'scene', campaignId: 'campaign', shownImage: 'map', imagePath: null, backgroundPath: null,
    fog: null, atmosphere: null, isLive: true, playArea: null,
    grid: { size: 50, offsetX: 0, offsetY: 0, visible: true },
  }} onSceneChange={vi.fn()} /></ThemeProvider>);
}

async function saveFromMenu(token, edit) {
  await act(async () => {
    await m.menu.current.onSave(token, {
      label: token.label, gmOnly: false, conditions: token.conditions, effects: token.effects,
      showHp: token.showHp, hpCurrent: token.hpCurrent, hpMax: token.hpMax, deathSaves: null, healthPatch: {},
      ...edit,
    });
  });
}

const hpWrites = () => m.updateToken.mock.calls.filter(([, patch]) => (
  ['hp_current', 'hp_max', 'conditions', 'effects'].some((key) => Object.hasOwn(patch, key))
));

beforeEach(() => {
  localStorage.clear();
  m.tokens.current = [OGRE];
  m.commit.mockReset().mockResolvedValue({ applied: true, row: null });
  m.updateToken.mockReset().mockResolvedValue(null);
  m.setTokenConditions.mockReset().mockResolvedValue(null);
  m.setTokenEffects.mockReset().mockResolvedValue(null);
  m.refreshVisibleTokens.mockReset();
  m.notify.mockReset();
  m.setTokenHp.mockReset().mockResolvedValue(undefined);
  m.secretHp.current = {};
  m.fightRows.current = [];
  m.isGm.current = true;
  m.characterCommand.mockReset().mockResolvedValue({ applied: true });
  m.roster.current = null;
});

test('a GM editing a linked enemy on the map writes its combatant once, never the piece vitals', async () => {
  mountEditor();
  await saveFromMenu(OGRE, { hpCurrent: 20, conditions: ['prone'] });
  expect(m.commit).toHaveBeenCalledTimes(1);
  expect(m.commit).toHaveBeenCalledWith('77', '0', {
    base: { hpCurrent: 30, hpMax: 59 },
    patch: { hpCurrent: 20, activeConditions: ['prone'] },
  });
  expect(hpWrites()).toEqual([]);
  expect(m.setTokenConditions).not.toHaveBeenCalled();
  // Only the piece's own data is written to the row.
  expect(m.updateToken).toHaveBeenCalledWith('ogre-piece', { label: 'Ogre', show_hp: true });
});

test('killing and reviving on the map follows the builder mortality rules', async () => {
  mountEditor();
  await saveFromMenu(OGRE, { conditions: ['dead'] });
  expect(m.commit.mock.calls[0][2].patch).toEqual({ hpCurrent: 0, activeConditions: ['dead'], isDead: true });
  const dead = { ...OGRE, hpCurrent: 0, conditions: ['dead'] };
  await saveFromMenu(dead, { conditions: [] });
  expect(m.commit.mock.calls[1][2].patch).toEqual({ hpCurrent: 1, activeConditions: [], isDead: false });
});

test('saving a linked enemy without a change writes nothing to the fight', async () => {
  mountEditor();
  await saveFromMenu(OGRE, { label: 'Big ogre' });
  expect(m.commit).not.toHaveBeenCalled();
  expect(hpWrites()).toEqual([]);
});

test('a conflict is not retried: the map realigns on the fight and stops', async () => {
  m.commit.mockResolvedValue({ applied: false, row: null });
  mountEditor();
  await saveFromMenu(OGRE, { hpCurrent: 20 });
  expect(m.commit).toHaveBeenCalledTimes(1);
  expect(m.refreshVisibleTokens).toHaveBeenCalledTimes(1);
  expect(m.notify).toHaveBeenCalledWith('warning', expect.any(String));
  expect(hpWrites()).toEqual([]);
});

test('a piece whose fight has no cloud row keeps its HP in the GM-only source', async () => {
  m.commit.mockRejectedValue(Object.assign(new Error('unavailable'), { code: 'FIGHT_UNAVAILABLE' }));
  mountEditor();
  await saveFromMenu(OGRE, { hpCurrent: 20 });
  expect(m.setTokenHp).toHaveBeenCalledWith('ogre-piece', { hpCurrent: 20, hpMax: 59 });
  expect(m.updateToken.mock.calls.some(([, patch]) => 'hp_current' in patch || 'hp_max' in patch)).toBe(false);
});

test('a stale local fight cache never writes enemy vitals, on mount or on later saves', () => {
  const cache = (hpCurrent) => {
    createInstance('encounters', { id: 'enc_a' });
    persistFights('enc_a', 77, [{ id: 77, fight: { combatants: [{
      id: 0, type: 'monster', hpCurrent, hpMax: 59, activeConditions: ['prone'], activeEffects: [],
    }] } }]);
  };
  cache(59); // an old copy from an earlier session
  mountEditor();
  for (const hp of [58, 57, 12]) act(() => cache(hp));
  expect(m.updateToken).not.toHaveBeenCalled();
  expect(m.commit).not.toHaveBeenCalled();
});

const MIMIC = {
  id: 'mimic-piece', layer: 'tokens', x: 2, y: 2, label: 'Chest', sourceRef: null,
  hpCurrent: null, hpMax: null, conditions: [], effects: [], showHp: false,
};
const lastViewportTokens = () => m.viewport.current?.tokens || [];

test('the GM sees real HP from the private sources while the public rows carry none', async () => {
  m.tokens.current = [{ ...OGRE, hpCurrent: null, hpMax: null, showHp: false }, MIMIC];
  m.fightRows.current = [{ id: '77', instance_id: 'enc_a', fight: { combatants: [{ id: 0, type: 'monster', hpCurrent: 12, hpMax: 59 }] } }];
  m.secretHp.current = { 'mimic-piece': { hpCurrent: 40, hpMax: 40 } };
  mountEditor();
  await waitFor(() => expect(lastViewportTokens().find((t) => t.id === 'mimic-piece')?.hpCurrent).toBe(40));
  expect(lastViewportTokens().find((t) => t.id === 'ogre-piece')).toMatchObject({ hpCurrent: 12, hpMax: 59 });
});

test('a player gets no overlay: hidden HP stay empty', async () => {
  m.isGm.current = false;
  m.tokens.current = [{ ...OGRE, hpCurrent: null, hpMax: null, showHp: false }, MIMIC];
  m.fightRows.current = [{ id: '77', instance_id: 'enc_a', fight: { combatants: [{ id: 0, type: 'monster', hpCurrent: 12, hpMax: 59 }] } }];
  m.secretHp.current = { 'mimic-piece': { hpCurrent: 40, hpMax: 40 } };
  mountEditor();
  await act(async () => {});
  for (const token of lastViewportTokens()) expect([token.hpCurrent, token.hpMax]).toEqual([null, null]);
});

test('the GM edits standalone HP in the private source only, and an unchanged save writes nothing', async () => {
  m.tokens.current = [MIMIC];
  m.secretHp.current = { 'mimic-piece': { hpCurrent: 40, hpMax: 40 } };
  mountEditor();
  const real = { ...MIMIC, hpCurrent: 40, hpMax: 40 };
  await saveFromMenu(real, { hpCurrent: 33 });
  expect(m.setTokenHp).toHaveBeenCalledWith('mimic-piece', { hpCurrent: 33, hpMax: 40 });
  await saveFromMenu(real, { showHp: true });
  expect(m.setTokenHp).toHaveBeenCalledTimes(1);
  expect(m.updateToken.mock.calls.some(([, patch]) => 'hp_current' in patch || 'hp_max' in patch)).toBe(false);
  expect(m.updateToken).toHaveBeenLastCalledWith('mimic-piece', expect.objectContaining({ show_hp: true }));
});

test('a character piece edited on the map commands health from the roster digest: no sheet is read', async () => {
  const hero = {
    id: 'hero-piece', layer: 'tokens', x: 2, y: 2, label: 'Hero', characterId: 'hero',
    hpCurrent: 18, hpMax: 30, conditions: [], effects: [], showHp: true,
  };
  const digest = { characterId: 'hero', rowRevision: 12, hpBasis: 'h1', currentHP: 18, source: 'server' };
  m.roster.current = {
    roster: [{ characterId: 'hero', name: 'Hero', hpCurrent: 18, hpMax: 30 }],
    digests: new Map([['hero', digest]]),
    baseMax: new Map([['hero', { hpBasis: 'h1', baseMax: 30 }]]),
  };
  m.tokens.current = [hero];
  mountEditor();
  await saveFromMenu(hero, { hpCurrent: 11, healthPatch: { currentHP: 11 } });
  await saveFromMenu(hero, { conditions: ['prone'], healthPatch: { activeConditions: ['prone'] } });
  expect(m.characterCommand).toHaveBeenCalledTimes(2);
  for (const [id, command, context] of m.characterCommand.mock.calls) {
    expect(context).toEqual({ digest, base: { hpBasis: 'h1', baseMax: 30 } });
    expect(healthCommandRoute(id, command, context)).toBe('digest');
  }
  expect(m.characterCommand.mock.calls[0][1]).toEqual({ type: 'editToken', patch: { currentHP: 11 } });
  // A character's hit points belong to the sheet, never to the piece.
  expect(m.updateToken.mock.calls.some(([, patch]) => Object.hasOwn(patch, 'hp_current'))).toBe(false);
});

test('a character piece\'s reminders go to its sheet, never onto the piece row', async () => {
  const hero = {
    id: 'hero-piece', layer: 'tokens', x: 2, y: 2, label: 'Hero', characterId: 'hero',
    hpCurrent: 18, hpMax: 30, conditions: [], effects: [], showHp: true,
  };
  const digest = { characterId: 'hero', rowRevision: 12, hpBasis: 'h1', currentHP: 18, source: 'server' };
  m.roster.current = {
    roster: [{ characterId: 'hero', name: 'Hero', hpCurrent: 18, hpMax: 30 }],
    digests: new Map([['hero', digest]]),
    baseMax: new Map([['hero', { hpBasis: 'h1', baseMax: 30 }]]),
  };
  m.tokens.current = [hero];
  mountEditor();
  const effects = [{ key: 'custom', text: 'Guidance' }];
  await saveFromMenu(hero, { effects, healthPatch: { activeEffects: effects } });
  expect(m.characterCommand).toHaveBeenCalledTimes(1);
  expect(m.characterCommand.mock.calls[0][1]).toEqual({
    type: 'editToken', patch: {}, addEffects: effects, removeEffects: [],
  });
  expect(m.setTokenEffects).not.toHaveBeenCalled();
  expect(m.updateToken.mock.calls.some(([, patch]) => Object.hasOwn(patch, 'effects'))).toBe(false);
});


// Every piece's hit points are managed from its menu: an encounter creature's
// on its stored combatant.
const fightWith = (combatant) => ({ id: '77', instance_id: 'enc_a', fight: { combatants: [
  { id: 0, type: 'monster', activeConditions: [], ...combatant },
] } });

async function ogreMenuVitals() {
  mountEditor();
  await waitFor(() => expect(lastViewportTokens().find((t) => t.id === 'ogre-piece')?.hpMax).toBe(59));
  act(() => m.viewport.menuOpener({ id: 'ogre-piece' }, { x: 1, y: 1 }));
  const { onVitals, token } = m.menu.current;
  return { token, onVitals: (command, shown) => onVitals(token, command, shown) };
}

test('damage on an encounter creature is applied to its stored combatant, temporary hit points first', async () => {
  m.fightRows.current = [fightWith({ hpCurrent: 30, hpMax: 59, tempHP: 5, maxHPBonus: 4 })];
  const { token, onVitals } = await ogreMenuVitals();
  // The menu reads the fight's temporary hit points and the maximum's bonus.
  expect(token).toMatchObject({ hpCurrent: 30, tempHp: 5, maxHpBonus: 4 });
  await act(async () => { await onVitals({ type: 'modifyHp', delta: -8 }); });
  expect(m.commit).toHaveBeenCalledWith('77', '0', {
    base: { hpCurrent: 30, hpMax: 59, tempHP: 5 },
    patch: { hpCurrent: 27, tempHP: 0 },
  });
  expect(hpWrites()).toEqual([]);
  expect(m.setTokenHp).not.toHaveBeenCalled();
});

test('a step that lost a race applies once more to the values the database answered with', async () => {
  m.fightRows.current = [fightWith({ hpCurrent: 30, hpMax: 59 })];
  m.commit
    .mockResolvedValueOnce({ applied: false, row: fightWith({ hpCurrent: 25, hpMax: 59 }) })
    .mockResolvedValueOnce({ applied: true, row: null });
  const { onVitals } = await ogreMenuVitals();
  await act(async () => { await onVitals({ type: 'modifyHp', delta: -10 }); });
  expect(m.commit).toHaveBeenCalledTimes(2);
  expect(m.commit.mock.calls[1][2]).toEqual({ base: { hpCurrent: 25, hpMax: 59, tempHP: null }, patch: { hpCurrent: 15 } });
  expect(m.notify).not.toHaveBeenCalled();
});

test('a value set outright is not replayed over a newer one', async () => {
  m.fightRows.current = [fightWith({ hpCurrent: 30, hpMax: 59 })];
  m.commit.mockResolvedValue({ applied: false, row: fightWith({ hpCurrent: 25, hpMax: 59 }) });
  const { onVitals } = await ogreMenuVitals();
  await act(async () => { await onVitals({ type: 'setTempHp', value: 6 }); });
  expect(m.commit).toHaveBeenCalledTimes(1);
  expect(m.notify).toHaveBeenCalledWith('warning', expect.any(String));
});

test('every piece gets the hit point commands for the GM, none for a player', async () => {
  m.tokens.current = [OGRE, MIMIC];
  mountEditor();
  await act(async () => {});
  for (const id of ['mimic-piece', 'ogre-piece']) {
    act(() => m.viewport.menuOpener({ id }, { x: 1, y: 1 }));
    expect(m.menu.current.onVitals).toEqual(expect.any(Function));
  }
});

test('a player is not handed the hit point commands', async () => {
  m.isGm.current = false;
  mountEditor();
  await act(async () => {});
  act(() => m.viewport.menuOpener({ id: 'ogre-piece' }, { x: 1, y: 1 }));
  expect(m.menu.current.onVitals).toBeNull();
});

test('quick steps are queued, each starting where the last one left the creature', async () => {
  m.fightRows.current = [{ ...fightWith({ hpCurrent: 30, hpMax: 59 }), vitals_revision: 1 }];
  m.commit
    .mockResolvedValueOnce({ applied: true, row: { ...fightWith({ hpCurrent: 25, hpMax: 59 }), vitals_revision: 2 } })
    .mockResolvedValueOnce({ applied: true, row: { ...fightWith({ hpCurrent: 20, hpMax: 59 }), vitals_revision: 3 } });
  const { onVitals } = await ogreMenuVitals();
  await act(async () => {
    await Promise.all([
      onVitals({ type: 'modifyHp', delta: -5 }),
      onVitals({ type: 'modifyHp', delta: -5 }),
    ]);
  });
  expect(m.commit.mock.calls.map(([, , call]) => call)).toEqual([
    { base: { hpCurrent: 30, hpMax: 59, tempHP: null }, patch: { hpCurrent: 25 } },
    { base: { hpCurrent: 25, hpMax: 59, tempHP: null }, patch: { hpCurrent: 20 } },
  ]);
});

test('a loose piece steps from what its menu shows and keeps temporary hit points in the GM-only source', async () => {
  m.tokens.current = [MIMIC];
  m.secretHp.current = { 'mimic-piece': { hpCurrent: 40, hpMax: 40, tempHp: 6 } };
  mountEditor();
  await waitFor(() => expect(lastViewportTokens().find((t) => t.id === 'mimic-piece')?.tempHp).toBe(6));
  act(() => m.viewport.menuOpener({ id: 'mimic-piece' }, { x: 1, y: 1 }));
  const { onVitals } = m.menu.current;
  const real = lastViewportTokens().find((t) => t.id === 'mimic-piece');
  await act(async () => {
    await onVitals(real, { type: 'modifyHp', delta: -10 }, { hpCurrent: 40, hpMax: 40, tempHP: 6, activeConditions: [] });
  });
  expect(m.setTokenHp).toHaveBeenLastCalledWith('mimic-piece', { hpCurrent: 36, hpMax: 40, tempHp: 0, maxHpBonus: 0 });
  await act(async () => { await onVitals(real, { type: 'setTempHp', value: 9 }); });
  expect(m.setTokenHp).toHaveBeenLastCalledWith('mimic-piece', { hpCurrent: 40, hpMax: 40, tempHp: 9, maxHpBonus: 0 });
  // Stepping the maximum shows how far it moved; typing one is a new base.
  await act(async () => { await onVitals(real, { type: 'modifyMaxHp', delta: 5 }); });
  expect(m.setTokenHp).toHaveBeenLastCalledWith('mimic-piece', { hpCurrent: 40, hpMax: 45, tempHp: 6, maxHpBonus: 5 });
  await act(async () => { await onVitals(real, { type: 'setMaxHp', value: 50 }, { hpCurrent: 40, hpMax: 45, tempHP: 0, maxHPBonus: 5 }); });
  expect(m.setTokenHp).toHaveBeenLastCalledWith('mimic-piece', { hpCurrent: 40, hpMax: 50, tempHp: 0, maxHpBonus: 0 });
  // Down to 0 is Dead, on the piece's own conditions.
  await act(async () => {
    await onVitals(real, { type: 'modifyHp', delta: -50 }, { hpCurrent: 40, hpMax: 40, tempHP: 0, activeConditions: [] });
  });
  expect(m.setTokenConditions).toHaveBeenLastCalledWith('mimic-piece', ['dead']);
  expect(m.updateToken.mock.calls.some(([, patch]) => 'hp_current' in patch)).toBe(false);
});

test('a character piece sends damage, temporary and maximum hit points to the sheet as they are', async () => {
  const hero = {
    id: 'hero-piece', layer: 'tokens', x: 2, y: 2, label: 'Hero', characterId: 'hero',
    hpCurrent: 18, hpMax: 30, conditions: [], effects: [], showHp: true,
  };
  const digest = { characterId: 'hero', rowRevision: 12, hpBasis: 'h1', currentHP: 18, maxHPBonus: 5, source: 'server' };
  m.roster.current = {
    roster: [{ characterId: 'hero', name: 'Hero', hpCurrent: 18, hpMax: 35, maxHpBonus: 5 }],
    digests: new Map([['hero', digest]]),
    baseMax: new Map([['hero', { hpBasis: 'h1', baseMax: 30 }]]),
  };
  m.tokens.current = [hero];
  mountEditor();
  act(() => m.viewport.menuOpener({ id: 'hero-piece' }, { x: 1, y: 1 }));
  const { onVitals, token } = m.menu.current;
  expect(token).toMatchObject({ hpMax: 35, maxHpBonus: 5 });
  const commands = [{ type: 'modifyHp', delta: -7 }, { type: 'setTempHp', value: 5 }, { type: 'setMaxHp', value: 34 }];
  for (const command of commands) await act(async () => { await onVitals(token, command, { hpCurrent: 18 }); });
  expect(m.characterCommand.mock.calls.map(([id, command, context]) => [id, command, healthCommandRoute(id, command, context)]))
    .toEqual(commands.map((command) => ['hero', command, 'digest']));
  expect(m.commit).not.toHaveBeenCalled();
  expect(m.setTokenHp).not.toHaveBeenCalled();
});
