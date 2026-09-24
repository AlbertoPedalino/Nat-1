import { act, render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { beforeEach, vi } from 'vitest';
import { theme } from '../../../../../src/app/theme.js';
import SceneEditor from '../../../../../src/pages/vtt/scene/SceneEditor.jsx';
import { persistFights, registerEncounterInstance } from '../../../../../src/pages/encounterbuilder/state/storage.js';

const m = vi.hoisted(() => ({
  commit: vi.fn(),
  updateToken: vi.fn(),
  setTokenConditions: vi.fn(),
  setTokenEffects: vi.fn(),
  refreshVisibleTokens: vi.fn(),
  notify: vi.fn(),
  menu: { current: null },
  realBridge: { current: false },
  tokens: { current: [] },
}));

vi.mock('../../../../../src/shared/cloud/api/encounterFights.js', () => ({
  FIGHT_UNAVAILABLE: 'FIGHT_UNAVAILABLE',
  commitFightCombatantVitals: (...args) => m.commit(...args),
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
}));
vi.mock('../../../../../src/shared/cloud/api/cloudCharacters.js', () => ({
  patchCharacterData: vi.fn(), commandCharacterVitals: vi.fn(),
}));
vi.mock('../../../../../src/shared/ui/ToastProvider.jsx', () => ({ useToast: () => ({ notify: m.notify }) }));
vi.mock('../../../../../src/shared/cloud/auth/AuthProvider.jsx', () => ({ useAuth: () => ({ user: { id: 'gm-1' } }) }));
vi.mock('../../../../../src/shared/vtt/session/useSceneRole.js', () => ({
  useSceneRole: () => ({ campaignName: 'C', gmId: 'gm-1', isGm: true, loading: false, ownedCharacterIds: [] }),
}));
vi.mock('../../../../../src/shared/vtt/session/useSceneLive.js', () => ({
  useSceneLive: () => ({
    sendCamera: vi.fn(), sendDrag: vi.fn(), sendPresenterInspection: vi.fn(), sendPresenterState: vi.fn(),
  }),
}));
vi.mock('../../../../../src/shared/character/profile/usePortraits.js', () => ({ usePortraits: () => ({}) }));
vi.mock('../../../../../src/pages/encounterbuilder/bestiary/useMonsterDb.js', () => ({ useMonsterDb: () => ({ monsters: [] }) }));
vi.mock('../../../../../src/pages/encounterbuilder/combat/useConditionEntries.js', () => ({ useConditionEntries: () => [] }));
vi.mock('../../../../../src/pages/vtt/tokens/useEncounterBridge.js', async (importOriginal) => {
  const { useEncounterBridge } = await importOriginal();
  return { useEncounterBridge: (options) => (m.realBridge.current
    ? useEncounterBridge(options) : { pull: vi.fn(), push: vi.fn() }) };
});
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
vi.mock('../../../../../src/pages/vtt/scene/useSceneContent.js', () => ({
  useSceneContent: () => ({
    beginTokenMove: () => () => {},
    drawings: [],
    handleCharacterEvent: vi.fn(),
    handleDrawingEvent: vi.fn(),
    loading: false,
    refreshVisibleTokens: m.refreshVisibleTokens,
    refreshContent: vi.fn(async () => {}),
    roster: [],
    setDrawings: vi.fn(),
    setRoster: vi.fn(),
    setTokens: vi.fn(),
    tokenImageUrls: {},
    tokens: m.tokens.current,
  }),
}));
vi.mock('../../../../../src/pages/vtt/map/SceneViewport.jsx', () => ({ default: () => <div data-testid="scene-viewport" /> }));
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
  m.realBridge.current = false;
  m.tokens.current = [OGRE];
  m.commit.mockReset().mockResolvedValue({ applied: true, row: null });
  m.updateToken.mockReset().mockResolvedValue(null);
  m.setTokenConditions.mockReset().mockResolvedValue(null);
  m.setTokenEffects.mockReset().mockResolvedValue(null);
  m.refreshVisibleTokens.mockReset();
  m.notify.mockReset();
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

test('a piece whose fight has no cloud row keeps its own values as before', async () => {
  m.commit.mockRejectedValue(Object.assign(new Error('unavailable'), { code: 'FIGHT_UNAVAILABLE' }));
  mountEditor();
  await saveFromMenu(OGRE, { hpCurrent: 20 });
  expect(hpWrites()).toEqual([['ogre-piece', expect.objectContaining({ hp_current: 20, hp_max: 59 })]]);
});

test('a stale local fight cache never writes enemy vitals, on mount or on later saves', () => {
  m.realBridge.current = true;
  const cache = (hpCurrent) => {
    registerEncounterInstance('enc_a', 'enc_a');
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
