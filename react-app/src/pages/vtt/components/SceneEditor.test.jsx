import {
  act, fireEvent, render, screen, waitFor,
} from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { beforeEach, vi } from 'vitest';
import { theme } from '../../../theme.js';
import SceneEditor from './SceneEditor.jsx';

const sceneViewportMock = vi.hoisted(() => vi.fn());
const signMapImageMock = vi.hoisted(() => vi.fn());
const notifyMock = vi.hoisted(() => vi.fn());
const sceneRoleMock = vi.hoisted(() => vi.fn());

const GM_ROLE = {
  campaignName: 'The Campaign',
  gmId: 'gm-1',
  isGm: true,
  loading: false,
  ownedCharacterIds: [],
};

beforeEach(() => {
  notifyMock.mockClear();
  sceneRoleMock.mockReturnValue(GM_ROLE);
});

vi.mock('../../../shared/cloud/vtt.js', async (importOriginal) => ({
  ...await importOriginal(),
  signMapImage: signMapImageMock,
}));

vi.mock('../../../shared/ToastProvider.jsx', () => ({
  useToast: () => ({ notify: notifyMock }),
}));
vi.mock('../../../shared/cloud/AuthProvider.jsx', () => ({
  useAuth: () => ({ user: { id: 'gm-1' } }),
}));
vi.mock('../../../shared/vtt/useSceneRole.js', () => ({
  useSceneRole: sceneRoleMock,
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
  useSceneHexcrawl: () => ({
    visible: true,
    cellsByKey: new Map([
      ['0,0', { q: 0, r: 0, revealed: true }],
      ['1,0', { q: 1, r: 0, revealed: false }],
    ]),
    partyHex: null,
  }),
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
    drawings: [
      { id: 'public-drawing', layer: 'tokens', color: '#ffffff' },
      { id: 'gm-drawing', layer: 'gm', color: '#ffffff' },
    ],
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
      { id: 'visible', layer: 'tokens', secretLabel: 'Mimic', x: 1, y: 1 },
      { id: 'staged', layer: 'tokens', x: 9, y: 1 },
      { id: 'hidden-map-prop', layer: 'map', hiddenFromPlayers: true, x: 1, y: 1 },
    ],
  }),
}));
vi.mock('./SceneViewport.jsx', () => ({
  default: (props) => {
    sceneViewportMock(props);
    return <div data-testid="scene-viewport">{props.tokens.map((token) => token.id).join(',')}</div>;
  },
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

test('a background scene never paints a battlemap frame while its image loads', () => {
  sceneViewportMock.mockClear();
  const scene = {
    id: 'scene-background',
    campaignId: 'campaign-1',
    shownImage: 'background',
    imagePath: 'campaign-1/scene-background/map.webp',
    backgroundPath: null,
    fog: null,
    isLive: false,
    playArea: null,
    grid: { size: 50, offsetX: 0, offsetY: 0, visible: true },
  };

  render(
    <ThemeProvider theme={theme}>
      <SceneEditor scene={scene} onSceneChange={vi.fn()} />
    </ThemeProvider>,
  );

  expect(sceneViewportMock.mock.calls[0][0]).toEqual(expect.objectContaining({
    backgroundOnly: true,
    imageUrl: null,
  }));
});

test('a GM can switch the battlemap to a read-only player view', () => {
  sceneViewportMock.mockClear();
  const scene = {
    id: 'scene-preview',
    campaignId: 'campaign-1',
    name: 'The Mimic Ambush',
    shownImage: 'map',
    imagePath: null,
    backgroundPath: null,
    fog: { cols: 1, rows: 1, cells: '0' },
    atmosphere: null,
    isLive: true,
    playArea: { x: 0, y: 0, w: 5, h: 5 },
    grid: { size: 50, offsetX: 0, offsetY: 0, visible: false },
  };

  render(
    <ThemeProvider theme={theme}>
      <SceneEditor scene={scene} onSceneChange={vi.fn()} />
    </ThemeProvider>,
  );

  expect(screen.getByTestId('scene-viewport')).toHaveTextContent('visible,staged,hidden-map-prop');
  const liveButton = screen.getByRole('button', { name: 'Live' });
  const playerViewButton = screen.getByRole('button', { name: 'Player view' });
  expect(liveButton.compareDocumentPosition(playerViewButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  act(() => {
    sceneViewportMock.mock.calls.at(-1)[0].onSelectDrawing('public-drawing');
  });
  expect(sceneViewportMock.mock.calls.at(-1)[0].selectedDrawingId).toBe('public-drawing');
  fireEvent.click(playerViewButton);

  expect(screen.getByRole('button', { name: 'Exit player view' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('heading', { name: 'The Campaign' })).toBeInTheDocument();
  expect(screen.getByTestId('scene-viewport')).toHaveTextContent('visible');
  expect(screen.getByTestId('scene-viewport')).not.toHaveTextContent('staged');
  expect(screen.getByTestId('scene-viewport')).not.toHaveTextContent('hidden-map-prop');

  const previewProps = sceneViewportMock.mock.calls.at(-1)[0];
  expect(previewProps.tokens[0]).not.toHaveProperty('secretLabel');
  expect(previewProps.drawings.map((drawing) => drawing.id)).toEqual(['public-drawing']);
  expect([...previewProps.hexCells.keys()]).toEqual(['0,0']);
  expect(previewProps).toEqual(expect.objectContaining({
    activeLayer: null,
    controls: null,
    fogOpacity: 1,
    imageSwitch: null,
    layerSwitch: null,
    onContextMenu: undefined,
    paintMode: 'select',
    selectedDrawingId: null,
    showPlayArea: false,
  }));
  expect(previewProps.canMove(previewProps.tokens[0])).toBe(false);
});

test('battlemap and background swap only after the next image is decoded', async () => {
  sceneViewportMock.mockClear();
  signMapImageMock.mockReset();
  signMapImageMock.mockImplementation(async (path) => `signed:${path}`);

  let finishBackgroundDecode;
  const backgroundDecoded = new Promise((resolve) => { finishBackgroundDecode = resolve; });
  let finishMapReturnDecode;
  const mapReturnDecoded = new Promise((resolve) => { finishMapReturnDecode = resolve; });
  let mapDecodeCount = 0;
  class ControlledImage {
    set src(value) { this.currentSrc = value; }

    get naturalWidth() { return this.currentSrc === 'signed:background.webp' ? 1600 : 2000; }

    get naturalHeight() { return this.currentSrc === 'signed:background.webp' ? 900 : 1000; }

    decode() {
      if (this.currentSrc === 'signed:background.webp') return backgroundDecoded;
      mapDecodeCount += 1;
      return mapDecodeCount > 1 ? mapReturnDecoded : Promise.resolve();
    }
  }
  vi.stubGlobal('Image', ControlledImage);

  const mapScene = {
    id: 'scene-transition',
    campaignId: 'campaign-1',
    name: 'A changing scene',
    shownImage: 'map',
    imagePath: 'map.webp',
    backgroundPath: 'background.webp',
    fog: null,
    atmosphere: null,
    isLive: false,
    playArea: null,
    grid: { size: 50, offsetX: 0, offsetY: 0, visible: true },
  };
  const renderEditor = (scene) => (
    <ThemeProvider theme={theme}>
      <SceneEditor scene={scene} onSceneChange={vi.fn()} />
    </ThemeProvider>
  );

  try {
    const { rerender } = render(renderEditor(mapScene));
    await waitFor(() => {
      expect(sceneViewportMock.mock.calls.at(-1)[0]).toEqual(expect.objectContaining({
        backgroundOnly: false,
        imageUrl: 'signed:map.webp',
        preparedImageSize: { width: 2000, height: 1000 },
      }));
    });

    rerender(renderEditor({ ...mapScene, shownImage: 'background' }));
    // No empty intermediate frame: the complete battlemap remains mounted
    // while the background is still decoding.
    expect(sceneViewportMock.mock.calls.at(-1)[0]).toEqual(expect.objectContaining({
      backgroundOnly: false,
      imageUrl: 'signed:map.webp',
      preparedImageSize: { width: 2000, height: 1000 },
    }));

    await act(async () => { finishBackgroundDecode(); });
    await waitFor(() => {
      expect(sceneViewportMock.mock.calls.at(-1)[0]).toEqual(expect.objectContaining({
        backgroundOnly: true,
        imageUrl: 'signed:background.webp',
        preparedImageSize: { width: 1600, height: 900 },
      }));
    });

    rerender(renderEditor(mapScene));
    expect(sceneViewportMock.mock.calls.at(-1)[0]).toEqual(expect.objectContaining({
      backgroundOnly: true,
      imageUrl: 'signed:background.webp',
      preparedImageSize: { width: 1600, height: 900 },
    }));

    await act(async () => { finishMapReturnDecode(); });
    await waitFor(() => {
      expect(sceneViewportMock.mock.calls.at(-1)[0]).toEqual(expect.objectContaining({
        backgroundOnly: false,
        imageUrl: 'signed:map.webp',
        preparedImageSize: { width: 2000, height: 1000 },
      }));
    });
  } finally {
    vi.unstubAllGlobals();
  }
});

test('a failed image decode keeps the current composition on screen', async () => {
  sceneViewportMock.mockClear();
  signMapImageMock.mockReset();
  signMapImageMock.mockImplementation(async (path) => `signed:${path}`);

  let rejectBackgroundDecode;
  const backgroundDecoded = new Promise((resolve, reject) => {
    rejectBackgroundDecode = reject;
  });
  class RejectingImage {
    set src(value) { this.currentSrc = value; }

    decode() {
      return this.currentSrc === 'signed:background.webp'
        ? backgroundDecoded
        : Promise.resolve();
    }
  }
  vi.stubGlobal('Image', RejectingImage);

  const mapScene = {
    id: 'scene-failed-transition',
    campaignId: 'campaign-1',
    name: 'A changing scene',
    shownImage: 'map',
    imagePath: 'map.webp',
    backgroundPath: 'background.webp',
    fog: null,
    atmosphere: null,
    isLive: false,
    playArea: null,
    grid: { size: 50, offsetX: 0, offsetY: 0, visible: true },
  };
  const renderEditor = (scene) => (
    <ThemeProvider theme={theme}>
      <SceneEditor scene={scene} onSceneChange={vi.fn()} />
    </ThemeProvider>
  );

  try {
    const { rerender } = render(renderEditor(mapScene));
    await waitFor(() => {
      expect(sceneViewportMock.mock.calls.at(-1)[0]).toEqual(expect.objectContaining({
        backgroundOnly: false,
        imageUrl: 'signed:map.webp',
      }));
    });

    rerender(renderEditor({ ...mapScene, shownImage: 'background' }));
    await waitFor(() => {
      expect(signMapImageMock).toHaveBeenCalledWith('background.webp');
    });
    await act(async () => {
      rejectBackgroundDecode(new Error('decode failed'));
    });

    await waitFor(() => {
      expect(notifyMock).toHaveBeenCalledWith('error', 'Could not load the scene image.');
    });
    expect(sceneViewportMock.mock.calls.at(-1)[0]).toEqual(expect.objectContaining({
      backgroundOnly: false,
      imageUrl: 'signed:map.webp',
    }));
  } finally {
    vi.unstubAllGlobals();
  }
});

test('player preview cannot remain active after GM permissions are lost', () => {
  sceneViewportMock.mockClear();
  const scene = {
    id: 'scene-role-change',
    campaignId: 'campaign-1',
    name: 'Changing hands',
    shownImage: 'map',
    imagePath: null,
    backgroundPath: null,
    fog: null,
    atmosphere: null,
    isLive: false,
    playArea: null,
    grid: { size: 50, offsetX: 0, offsetY: 0, visible: true },
  };
  const renderEditor = () => (
    <ThemeProvider theme={theme}>
      <SceneEditor scene={scene} onSceneChange={vi.fn()} />
    </ThemeProvider>
  );

  const { rerender } = render(renderEditor());
  fireEvent.click(screen.getByRole('button', { name: 'Player view' }));
  expect(screen.getByRole('button', { name: 'Exit player view' })).toBeInTheDocument();

  sceneRoleMock.mockReturnValue({ ...GM_ROLE, isGm: false });
  rerender(renderEditor());
  expect(screen.queryByRole('button', { name: 'Exit player view' })).not.toBeInTheDocument();

  sceneRoleMock.mockReturnValue(GM_ROLE);
  rerender(renderEditor());
  expect(screen.getByRole('button', { name: 'Player view' })).toHaveAttribute('aria-pressed', 'false');
});
