import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { createFog, setCells } from '../../../../../src/shared/vtt/map/fog.js';
import TokenLayer from '../../../../../src/pages/vtt/tokens/TokenLayer.jsx';

const sprite = vi.hoisted(() => vi.fn(({ token }) => <div data-testid={`token-${token.id}`} />));
vi.mock('../../../../../src/pages/vtt/tokens/TokenSprite.jsx', () => ({ default: sprite }));

const tokens = [
  { id: 'near', layer: 'tokens', x: 1, y: 1, w: 1, h: 1 },
  { id: 'far', layer: 'tokens', x: 100, y: 100, w: 1, h: 1 },
];
const stable = {
  view: { x: 0, y: 0, zoom: 1 },
  viewportSize: { width: 320, height: 240 },
  grid: { size: 50, offsetX: 0, offsetY: 0 },
  activeLayer: 'tokens',
  playArea: null,
  showPlayArea: false,
  cameraLocked: false,
  paintMode: 'select',
  canMove: () => true,
  selectedMapObjectId: null,
  canSetDeathSaves: () => false,
  conditionEntries: [],
  onBeginDrag: vi.fn(),
  onBeginResize: vi.fn(),
  onBeginRotate: vi.fn(),
  onDeathSaveChange: vi.fn(),
  onContextMenu: vi.fn(),
};

test('tokens well outside the viewport are culled', () => {
  render(<TokenLayer {...stable} tokens={tokens} />);

  expect(screen.getByTestId('token-near')).toBeInTheDocument();
  expect(screen.queryByTestId('token-far')).not.toBeInTheDocument();
});

test('a drag rerenders the moving token but not its unchanged neighbours', () => {
  const visibleTokens = [tokens[0], { ...tokens[0], id: 'neighbour', x: 2 }];
  const { rerender } = render(<TokenLayer {...stable} tokens={visibleTokens} />);
  sprite.mockClear();

  rerender(<TokenLayer {...stable} tokens={visibleTokens} drag={{ id: 'near', x: 1.5, y: 1 }} />);

  expect(sprite).toHaveBeenCalledOnce();
  expect(sprite.mock.calls[0][0].token).toEqual(expect.objectContaining({ id: 'near', x: 1.5 }));
});

test('public fog omits a fully covered token until its area is revealed', () => {
  const fog = createFog(6, 5, 1);
  const { rerender } = render(
    <TokenLayer {...stable} tokens={[tokens[0]]} fog={fog} hideCovered />,
  );

  expect(screen.queryByTestId('token-near')).not.toBeInTheDocument();

  rerender(
    <TokenLayer
      {...stable}
      tokens={[tokens[0]]}
      fog={setCells(fog, [{ col: 1, row: 1 }], true)}
      hideCovered
    />,
  );
  expect(screen.getByTestId('token-near')).toBeInTheDocument();
});

test('GM fog never removes covered tokens from the editor', () => {
  render(<TokenLayer {...stable} tokens={[tokens[0]]} fog={createFog(6, 5, 1)} />);

  expect(screen.getByTestId('token-near')).toBeInTheDocument();
});

test.each(['select', 'ruler'])('owned markers remain visible under public fog with the %s tool', (paintMode) => {
  const mine = { ...tokens[0], id: 'mine' };
  const other = { ...tokens[0], id: 'other', x: 2 };
  render(<TokenLayer
    {...stable}
    tokens={[mine, other]}
    fog={createFog(6, 5, 1)}
    hideCovered
    paintMode={paintMode}
    canSeeThroughFog={(token) => token.id === 'mine'}
  />);
  expect(screen.getByTestId('token-mine')).toBeInTheDocument();
  expect(screen.queryByTestId('token-other')).not.toBeInTheDocument();
});

test('party visibility through fog respects explicit hiding and the play area', () => {
  render(<TokenLayer {...stable} hideCovered cameraLocked canMove={() => false}
    fog={createFog(6, 5, 1)} playArea={{ x: 0, y: 0, w: 3, h: 3 }}
    tokens={[
      { ...tokens[0], id: 'party', characterId: 'hero' },
      { ...tokens[0], id: 'hidden', characterId: 'hero', hiddenFromPlayers: true },
      { ...tokens[0], id: 'gm', characterId: 'hero', layer: 'gm' },
      { ...tokens[0], id: 'staged', characterId: 'hero', x: 4 },
      { ...tokens[0], id: 'monster' },
    ]}
  />);
  expect(screen.getByTestId('token-party')).toBeInTheDocument();
  for (const id of ['hidden', 'gm', 'staged', 'monster']) {
    expect(screen.queryByTestId(`token-${id}`)).not.toBeInTheDocument();
  }
});
