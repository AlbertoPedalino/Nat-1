import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { vi } from 'vitest';
import { theme } from '../../../theme.js';
import SceneEditor from './SceneEditor.jsx';

vi.mock('../../../shared/ToastProvider.jsx', () => ({
  useToast: () => ({ notify: vi.fn() }),
}));
vi.mock('../../../shared/cloud/AuthProvider.jsx', () => ({
  useAuth: () => ({ user: { id: 'gm-1' } }),
}));
vi.mock('../../../shared/vtt/useSceneRole.js', () => ({
  useSceneRole: () => ({
    campaignName: 'The Campaign', gmId: 'gm-1', isGm: true, loading: false, ownedCharacterIds: [],
  }),
}));
vi.mock('../../../shared/vtt/useSceneLive.js', () => ({
  useSceneLive: () => ({ sendCamera: vi.fn(), sendDrag: vi.fn(), sendPresenterState: vi.fn() }),
}));
vi.mock('../../../shared/character/usePortraits.js', () => ({ usePortraits: () => ({}) }));
vi.mock('../../encounterbuilder/hooks/useMonsterDb.js', () => ({
  useMonsterDb: () => ({ monsters: [] }),
}));
vi.mock('../../encounterbuilder/hooks/useConditionEntries.js', () => ({
  useConditionEntries: () => [],
}));
vi.mock('../hooks/useEncounterBridge.js', () => ({
  useEncounterBridge: () => ({ pull: vi.fn(), push: vi.fn() }),
}));
vi.mock('../hooks/useSceneDungeon.js', () => ({
  useSceneDungeon: () => ({ fights: [], monstersForRoom: () => [], markersForRoom: () => [] }),
}));
vi.mock('../hooks/useSceneHexcrawl.js', () => ({
  useSceneHexcrawl: () => ({ visible: false, cellsByKey: new Map(), partyHex: null }),
}));
vi.mock('../hooks/useVttRolls.js', () => ({
  useVttRolls: () => ({
    clearFeed: vi.fn(),
    diceThrows: [],
    dismissToast: vi.fn(),
    feed: [],
    handleCustomRoll: vi.fn(),
    handleSheetRoll: vi.fn(),
    rollBubbles: [],
    showSettledToast: vi.fn(),
    toast: null,
  }),
}));
vi.mock('../hooks/useSceneContent.js', () => ({
  useSceneContent: () => ({
    drawings: [],
    handleCharacterEvent: vi.fn(),
    handleDrawingEvent: vi.fn(),
    loading: false,
    refreshVisibleTokens: vi.fn(),
    roster: [],
    setDrawings: vi.fn(),
    setRoster: vi.fn(),
    setTokens: vi.fn(),
    tokenImageUrls: {},
    tokens: [
      { id: 'visible', layer: 'tokens', x: 1, y: 1 },
      { id: 'staged', layer: 'tokens', x: 9, y: 1 },
      { id: 'hidden-map-prop', layer: 'map', hiddenFromPlayers: true, x: 1, y: 1 },
    ],
  }),
}));
vi.mock('./SceneViewport.jsx', () => ({
  default: ({ tokens }) => <div data-testid="scene-viewport">{tokens.map((token) => token.id).join(',')}</div>,
}));

test('the spectator composition applies the player boundary before rendering the viewport', () => {
  const scene = {
    id: 'scene-1',
    campaignId: 'campaign-1',
    shownImage: 'map',
    imagePath: null,
    backgroundPath: null,
    fog: null,
    isLive: true,
    playArea: { x: 0, y: 0, w: 5, h: 5 },
    grid: { size: 50, offsetX: 0, offsetY: 0, visible: false },
  };

  render(
    <ThemeProvider theme={theme}>
      <SceneEditor scene={scene} spectator onSceneChange={vi.fn()} />
    </ThemeProvider>,
  );

  expect(screen.getByTestId('scene-viewport')).toHaveTextContent('visible');
  expect(screen.getByTestId('scene-viewport')).not.toHaveTextContent('staged');
  expect(screen.getByTestId('scene-viewport')).not.toHaveTextContent('hidden-map-prop');
});
