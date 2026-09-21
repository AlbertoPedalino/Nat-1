import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import SceneViewport from '../../../../../src/pages/vtt/map/SceneViewport.jsx';

const tray = vi.hoisted(() => vi.fn());
vi.mock('../../../../../src/pages/vtt/rolls/DiceTray.jsx', () => ({
  default: (props) => { tray(props); return null; },
}));

test.each([false, true])('background rolls ignore hidden pieces and map mode restores their anchors (projector: %s)', (cameraLocked) => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(800);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(600);
  const token = Object.freeze({ id: 'hero', characterId: 'character', label: 'Hero piece', layer: 'tokens', x: 7, y: 8 });
  const roll = { id: 'roll', label: 'Perception roll', actorName: 'Player', total: 14, rolls: [] };
  const onMoveToken = vi.fn();
  const props = {
    scene: { grid: { size: 50, offsetX: 0, offsetY: 0, visible: false }, playArea: null },
    imageUrl: 'scene.webp', tokens: Object.freeze([token]), canMove: () => false,
    fog: null, drawings: [], lasers: [], cameraLocked, onMoveToken,
    rollBubbles: [{ roll, token }], diceThrows: [{ roll, token }],
  };
  const { rerender } = render(<SceneViewport {...props} backgroundOnly />);
  expect(screen.queryByText('Hero piece')).not.toBeInTheDocument();
  expect(screen.queryByText('Perception roll')).not.toBeInTheDocument();
  expect(tray.mock.calls.at(-1)[0]).toMatchObject({
    centered: true, throws: [{ roll, x: 400, y: 300 }],
  });

  rerender(<SceneViewport {...props} backgroundOnly={false} />);
  expect(screen.getByText('Perception roll')).toBeInTheDocument();
  expect(tray.mock.calls.at(-1)[0]).toMatchObject({
    centered: false, throws: [{ roll, x: 375, y: 468 }],
  });

  const distantToken = { ...token, x: -100, y: 100 };
  rerender(<SceneViewport {...props} backgroundOnly diceThrows={[{ roll, token: distantToken }]} />);
  expect(screen.queryByText('Perception roll')).not.toBeInTheDocument();
  expect(tray.mock.calls.at(-1)[0]).toMatchObject({
    centered: true, throws: [{ roll, x: 400, y: 300 }],
  });
  expect(onMoveToken).not.toHaveBeenCalled();
  expect(token).toMatchObject({ x: 7, y: 8 });
});
