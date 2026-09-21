import {
  act, fireEvent, render, screen, waitFor,
} from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { beforeEach, vi } from 'vitest';
import { theme } from '../../../../../src/app/theme.js';
import SceneEditor from '../../../../../src/pages/vtt/scene/SceneEditor.jsx';

const sceneViewportMock = vi.hoisted(() => vi.fn());
const signMapImageMock = vi.hoisted(() => vi.fn());
const notifyMock = vi.hoisted(() => vi.fn());
const sceneRoleMock = vi.hoisted(() => vi.fn());
const sendPresenterStateMock = vi.hoisted(() => vi.fn());
const updateSceneMock = vi.hoisted(() => vi.fn());
const updateTokenMock = vi.hoisted(() => vi.fn());
const beginTokenMoveMock = vi.hoisted(() => vi.fn());
const finishTokenMoveMock = vi.hoisted(() => vi.fn());
const fetchSceneMock = vi.hoisted(() => vi.fn());
const refreshContentMock = vi.hoisted(() => vi.fn());
const sceneLiveOptions = vi.hoisted(() => ({ current: null }));
const sheetRoster = vi.hoisted(() => ({ current: [] }));

const GM_ROLE = {
  campaignName: 'The Campaign',
  gmId: 'gm-1',
  isGm: true,
  loading: false,
  ownedCharacterIds: [],
};

beforeEach(() => {
  sheetRoster.current = [];
  notifyMock.mockClear();
  sendPresenterStateMock.mockClear();
  sceneRoleMock.mockReturnValue(GM_ROLE);
  updateSceneMock.mockReset();
  updateSceneMock.mockResolvedValue(null);
  updateTokenMock.mockReset().mockResolvedValue(null);
  finishTokenMoveMock.mockReset();
  beginTokenMoveMock.mockReset().mockReturnValue(finishTokenMoveMock);
  fetchSceneMock.mockReset().mockResolvedValue(null);
  refreshContentMock.mockReset().mockResolvedValue(undefined);
  sceneLiveOptions.current = null;
});

vi.mock('../../../../../src/shared/cloud/api/vtt.js', async (importOriginal) => ({
  ...await importOriginal(),
  signMapImage: signMapImageMock,
  updateScene: updateSceneMock,
  updateToken: updateTokenMock,
  fetchScene: fetchSceneMock,
}));

vi.mock('../../../../../src/shared/ui/ToastProvider.jsx', () => ({
  useToast: () => ({ notify: notifyMock }),
}));
vi.mock('../../../../../src/shared/cloud/auth/AuthProvider.jsx', () => ({
  useAuth: () => ({ user: { id: 'gm-1' } }),
}));
vi.mock('../../../../../src/shared/vtt/session/useSceneRole.js', () => ({
  useSceneRole: sceneRoleMock,
}));
vi.mock('../../../../../src/shared/vtt/session/useSceneLive.js', () => ({
  useSceneLive: (options) => {
    sceneLiveOptions.current = options;
    return {
      sendCamera: vi.fn(),
      sendDrag: vi.fn(),
      sendPresenterInspection: vi.fn(),
      sendPresenterState: sendPresenterStateMock,
    };
  },
}));
vi.mock('../../../../../src/shared/character/profile/usePortraits.js', () => ({ usePortraits: () => ({}) }));
vi.mock('../../../../../src/pages/encounterbuilder/bestiary/useMonsterDb.js', () => ({
  useMonsterDb: () => ({ monsters: [] }),
}));
vi.mock('../../../../../src/pages/encounterbuilder/combat/useConditionEntries.js', () => ({
  useConditionEntries: () => [],
}));
vi.mock('../../../../../src/pages/vtt/tokens/useEncounterBridge.js', () => ({
  useEncounterBridge: () => ({ pull: vi.fn(), push: vi.fn() }),
}));
vi.mock('../../../../../src/pages/vtt/dungeon/useSceneDungeon.js', () => ({
  useSceneDungeon: () => ({ fights: [], monstersForRoom: () => [], markersForRoom: () => [] }),
}));
vi.mock('../../../../../src/pages/vtt/hexcrawl/useSceneHexcrawl.js', () => ({
  useSceneHexcrawl: () => ({
    visible: true,
    cellsByKey: new Map([
      ['0,0', { q: 0, r: 0, revealed: true }],
      ['1,0', { q: 1, r: 0, revealed: false }],
    ]),
    partyHex: null,
  }),
}));
vi.mock('../../../../../src/pages/vtt/rolls/useVttRolls.js', () => ({
  useVttRolls: () => ({
    clearFeed: vi.fn(),
    diceThrows: [],
    dismissToast: vi.fn(),
    feed: [],
    handleCustomRoll: vi.fn(),
    handleSheetRoll: vi.fn(),
    rollBubbles: [],
    toast: null,
  }),
}));
vi.mock('../../../../../src/pages/vtt/scene/useSceneContent.js', () => ({
  useSceneContent: () => ({
    beginTokenMove: beginTokenMoveMock,
    drawings: [
      { id: 'public-drawing', layer: 'tokens', color: '#ffffff' },
      { id: 'gm-drawing', layer: 'gm', color: '#ffffff' },
    ],
    handleCharacterEvent: vi.fn(),
    handleDrawingEvent: vi.fn(),
    loading: false,
    refreshVisibleTokens: vi.fn(),
    refreshContent: refreshContentMock,
    roster: sheetRoster.current,
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
vi.mock('../../../../../src/pages/vtt/map/SceneViewport.jsx', () => ({
  default: (props) => {
    sceneViewportMock(props);
    return <div data-testid="scene-viewport">{props.tokens.map((token) => token.id).join(',')}</div>;
  },
}));

vi.mock('../../../../../src/pages/campaignsheet/CampaignSheetView.jsx', () => ({
  default: ({ sheetId }) => <div data-testid="campaign-sheet">Sheet {sheetId}</div>,
}));

test('opening the scene sheet keeps the map visible alongside the selected character', async () => {
  sheetRoster.current = [{ characterId: 'aria', name: 'Aria', ownerId: 'gm-1' }];
  const scene = {
    id: 'scene-sheet',
    campaignId: 'campaign-1',
    shownImage: 'map',
    imagePath: null,
    backgroundPath: null,
    fog: null,
    isLive: true,
    playArea: null,
    grid: { size: 50, offsetX: 0, offsetY: 0, visible: false },
  };
  render(
    <ThemeProvider theme={theme}>
      <SceneEditor scene={scene} onSceneChange={vi.fn()} />
    </ThemeProvider>,
  );
  const map = screen.getByTestId('scene-viewport');
  expect(map).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Show character sheet' }));
  expect(await screen.findByTestId('campaign-sheet')).toHaveTextContent('Sheet aria');
  expect(screen.getByTestId('campaign-sheet')).toBeVisible();
  expect(map).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Hide character sheet' }));
  expect(screen.queryByTestId('campaign-sheet')).not.toBeInTheDocument();
  expect(screen.getByTestId('scene-viewport')).toBe(map);
  expect(map).toBeVisible();
});

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
  expect(sceneViewportMock.mock.calls.at(-1)[0].fogOnTop).toBe(true);
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
  expect(sceneViewportMock.mock.calls.at(-1)[0].fogOnTop).toBe(false);
  const liveButton = screen.getByRole('button', { name: 'Live' });
  const playerViewButton = screen.getByRole('button', { name: 'Player view' });
  const freezeButton = screen.getByRole('button', { name: 'Freeze view' });
  const projectorButton = screen.getByRole('button', { name: 'Projector mode' });
  expect(liveButton.compareDocumentPosition(playerViewButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(freezeButton.compareDocumentPosition(projectorButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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
    fogOnTop: true,
    imageSwitch: null,
    layerSwitch: null,
    onContextMenu: undefined,
    paintMode: 'select',
    selectedDrawingId: null,
    showPlayArea: false,
  }));
  expect(previewProps.canMove(previewProps.tokens[0])).toBe(false);
});

test('freezing the public view lets the GM prepare a picture before sharing it', async () => {
  sceneViewportMock.mockClear();
  const onSceneChange = vi.fn();
  const scene = {
    id: 'scene-frozen-view',
    campaignId: 'campaign-1',
    name: 'A hidden transition',
    shownImage: 'map',
    imagePath: null,
    backgroundPath: null,
    fog: null,
    atmosphere: null,
    isLive: true,
    playArea: null,
    grid: { size: 50, offsetX: 0, offsetY: 0, visible: true },
  };

  render(
    <ThemeProvider theme={theme}>
      <SceneEditor scene={scene} onSceneChange={onSceneChange} />
    </ThemeProvider>,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Freeze view' }));
  expect(screen.getByRole('button', { name: 'Unfreeze view' })).toHaveAttribute('aria-pressed', 'true');
  expect(sendPresenterStateMock).toHaveBeenLastCalledWith(expect.objectContaining({
    following: false,
    shownImage: 'map',
  }));

  sendPresenterStateMock.mockClear();
  const imageSwitch = sceneViewportMock.mock.calls.at(-1)[0].imageSwitch;
  const mapCorner = imageSwitch.props.children[0];
  await act(async () => mapCorner.props.onShownImageChange('background'));

  await waitFor(() => {
    expect(sceneViewportMock.mock.calls.at(-1)[0].backgroundOnly).toBe(true);
  });
  expect(onSceneChange).not.toHaveBeenCalled();
  expect(updateSceneMock).not.toHaveBeenCalled();
  expect(sendPresenterStateMock).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: 'Unfreeze view' }));
  await waitFor(() => {
    expect(onSceneChange).toHaveBeenCalledWith(expect.objectContaining({ shownImage: 'background' }));
    expect(updateSceneMock).toHaveBeenCalledWith(scene.id, { shownImage: 'background' });
    expect(sendPresenterStateMock).toHaveBeenLastCalledWith(expect.objectContaining({
      following: true,
      shownImage: 'background',
    }));
  });
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

test('players receive the group-selection tool with permission-checked batch actions', () => {
  sceneViewportMock.mockClear();
  sceneRoleMock.mockReturnValue({
    ...GM_ROLE,
    isGm: false,
    ownedCharacterIds: ['hero-1'],
  });
  const scene = {
    id: 'scene-player-selection',
    campaignId: 'campaign-1',
    shownImage: 'map',
    imagePath: null,
    backgroundPath: null,
    fog: null,
    atmosphere: null,
    isLive: true,
    playArea: null,
    grid: { size: 50, offsetX: 0, offsetY: 0, visible: true },
  };

  render(
    <ThemeProvider theme={theme}>
      <SceneEditor scene={scene} onSceneChange={vi.fn()} />
    </ThemeProvider>,
  );

  const props = sceneViewportMock.mock.calls.at(-1)[0];
  expect(props.controls.props.groups.map((group) => group.id)).toContain('select');
  expect(props.onMoveTokens).toEqual(expect.any(Function));
  expect(props.onDeleteTokens).toEqual(expect.any(Function));
});

test.each([
  ['single', false], ['single', true], ['group', false], ['group', true],
])('%s moves protect their tokens until saving settles (failure: %s)', async (kind, fail) => {
  let settle;
  updateTokenMock.mockReturnValueOnce(new Promise((resolve, reject) => {
    settle = () => fail ? reject(new Error('Offline')) : resolve(null);
  }));
  const scene = {
    id: 'scene-moving', campaignId: 'campaign-1', shownImage: 'map',
    imagePath: null, backgroundPath: null, fog: null, atmosphere: null,
    isLive: true, playArea: null, grid: { size: 50, offsetX: 0, offsetY: 0, visible: true },
  };
  render(<ThemeProvider theme={theme}><SceneEditor scene={scene} onSceneChange={vi.fn()} /></ThemeProvider>);
  const props = sceneViewportMock.mock.calls.at(-1)[0];
  const token = { id: 'moving', layer: 'tokens', x: 0, y: 0 };
  let saving;
  act(() => {
    saving = kind === 'single'
      ? props.onMoveToken(token, { x: 10, y: 5 })
      : props.onMoveTokens([
        { token, position: { x: 10, y: 5 } },
        { token: { ...token, id: 'second' }, position: { x: 11, y: 5 } },
      ]);
  });
  expect(beginTokenMoveMock).toHaveBeenCalledWith(kind === 'single' ? ['moving'] : ['moving', 'second']);
  expect(finishTokenMoveMock).not.toHaveBeenCalled();
  await act(async () => { settle(); await saving; });
  expect(finishTokenMoveMock).toHaveBeenCalledTimes(1);
});

test('an obsolete image load cannot restart the current image during reconciliation', async () => {
  sceneViewportMock.mockClear();
  signMapImageMock.mockReset().mockImplementation(async (path) => `signed:${path}`);
  let finishOld;
  let finishCurrent;
  const oldDecode = new Promise((resolve) => { finishOld = resolve; });
  const currentDecode = new Promise((resolve) => { finishCurrent = resolve; });
  class ControlledImage {
    set src(value) { this.currentSrc = value; }
    get naturalWidth() { return 1600; }
    get naturalHeight() { return 900; }
    decode() { return this.currentSrc === 'signed:map.webp' ? oldDecode : currentDecode; }
  }
  vi.stubGlobal('Image', ControlledImage);
  const scene = {
    id: 'scene-race', campaignId: 'campaign-1', name: 'Changing scene',
    shownImage: 'map', imagePath: 'map.webp', backgroundPath: 'background.webp',
    fog: null, atmosphere: null, isLive: true, playArea: null,
    grid: { size: 50, offsetX: 0, offsetY: 0, visible: true },
  };
  const renderEditor = (value) => (
    <ThemeProvider theme={theme}>
      <SceneEditor scene={value} onSceneChange={vi.fn()} />
    </ThemeProvider>
  );
  try {
    const { rerender } = render(renderEditor(scene));
    await act(async () => {});
    rerender(renderEditor({ ...scene, shownImage: 'background' }));
    await act(async () => {});
    expect(signMapImageMock).toHaveBeenCalledTimes(2);
    await act(async () => { finishOld(); });
    await act(async () => { await sceneLiveOptions.current.onReconcile(); });
    expect(signMapImageMock).toHaveBeenCalledTimes(2);
    await act(async () => { finishCurrent(); });
    expect(sceneViewportMock.mock.calls.at(-1)[0].imageUrl).toBe('signed:background.webp');
  } finally {
    await act(async () => { finishCurrent(); });
    vi.unstubAllGlobals();
  }
});

test('a picture that failed to load is retried by the reconciliation, not left behind', async () => {
  sceneViewportMock.mockClear();
  signMapImageMock.mockReset();
  // The first attempt fails the way a dropped connection does; the scene row
  // itself stays correct, so nothing in the data tells this client to retry.
  signMapImageMock
    .mockRejectedValueOnce(new Error('offline'))
    .mockImplementation(async (path) => `signed:${path}`);

  class LoadedImage {
    set src(value) { this.currentSrc = value; }

    get naturalWidth() { return 1600; }

    get naturalHeight() { return 900; }

    decode() { return Promise.resolve(); }
  }
  vi.stubGlobal('Image', LoadedImage);

  const scene = {
    id: 'scene-recovering',
    campaignId: 'campaign-1',
    name: 'A scene that failed once',
    shownImage: 'background',
    imagePath: 'map.webp',
    backgroundPath: 'background.webp',
    fog: null,
    atmosphere: null,
    isLive: true,
    playArea: null,
    grid: { size: 50, offsetX: 0, offsetY: 0, visible: true },
  };

  try {
    render(
      <ThemeProvider theme={theme}>
        <SceneEditor scene={scene} onSceneChange={vi.fn()} />
      </ThemeProvider>,
    );
    await waitFor(() => {
      expect(notifyMock).toHaveBeenCalledWith('error', 'Could not load the scene image.');
    });
    expect(sceneViewportMock.mock.calls.at(-1)[0].imageUrl).toBe(null);

    // The reconciliation already runs on a timer, on reconnect and when the tab
    // comes back. It now repairs the picture as well as the row.
    await act(async () => { await sceneLiveOptions.current.onReconcile(); });
    await waitFor(() => {
      expect(sceneViewportMock.mock.calls.at(-1)[0]).toEqual(expect.objectContaining({
        imageUrl: 'signed:background.webp',
        preparedImageSize: { width: 1600, height: 900 },
      }));
    });
  } finally {
    vi.unstubAllGlobals();
  }
});

test('the reconciliation leaves a picture that is already on screen alone', async () => {
  sceneViewportMock.mockClear();
  signMapImageMock.mockReset();
  signMapImageMock.mockImplementation(async (path) => `signed:${path}`);

  class LoadedImage {
    set src(value) { this.currentSrc = value; }

    get naturalWidth() { return 1600; }

    get naturalHeight() { return 900; }

    decode() { return Promise.resolve(); }
  }
  vi.stubGlobal('Image', LoadedImage);

  const scene = {
    id: 'scene-settled',
    campaignId: 'campaign-1',
    name: 'A settled scene',
    shownImage: 'map',
    imagePath: 'map.webp',
    backgroundPath: null,
    fog: null,
    atmosphere: null,
    isLive: true,
    playArea: null,
    grid: { size: 50, offsetX: 0, offsetY: 0, visible: true },
  };

  try {
    render(
      <ThemeProvider theme={theme}>
        <SceneEditor scene={scene} onSceneChange={vi.fn()} />
      </ThemeProvider>,
    );
    await waitFor(() => {
      expect(sceneViewportMock.mock.calls.at(-1)[0].imageUrl).toBe('signed:map.webp');
    });
    signMapImageMock.mockClear();

    // No wasted download: a battlemap is large, and this runs every 30 seconds
    // on every device at the table.
    await act(async () => { await sceneLiveOptions.current.onReconcile(); });
    await act(async () => { await sceneLiveOptions.current.onReconcile(); });
    expect(signMapImageMock).not.toHaveBeenCalled();
  } finally {
    vi.unstubAllGlobals();
  }
});
