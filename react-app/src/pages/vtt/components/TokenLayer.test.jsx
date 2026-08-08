import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import TokenLayer from './TokenLayer.jsx';

const sprite = vi.hoisted(() => vi.fn(({ token }) => <div data-testid={`token-${token.id}`} />));
vi.mock('./TokenSprite.jsx', () => ({ default: sprite }));

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
