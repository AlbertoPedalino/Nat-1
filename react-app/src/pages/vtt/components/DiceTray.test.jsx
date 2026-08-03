import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import DiceTray, { RESULT_REVEAL_HOLD_MS } from './DiceTray.jsx';

const mocks = vi.hoisted(() => ({ simulateThrow: vi.fn() }));

vi.mock('../../../shared/vtt/dicePhysics.js', async (importOriginal) => ({
  ...await importOriginal(),
  simulateThrow: mocks.simulateThrow,
}));

vi.mock('../../../shared/character/Die3D.jsx', () => ({
  default: () => <div data-testid="die" />,
}));

beforeEach(() => {
  vi.useFakeTimers();
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 800 });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 600 });
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    disconnect() {}
  });
  vi.stubGlobal('requestAnimationFrame', (callback) => setTimeout(() => callback(performance.now()), 1));
  vi.stubGlobal('cancelAnimationFrame', (id) => clearTimeout(id));
  mocks.simulateThrow.mockReturnValue({
    frames: [
      [{ x: 0, y: 0, z: 120, q: [1, 0, 0, 0] }],
      [{ x: 12, y: 4, z: 18, q: [1, 0, 0, 0] }],
      [{ x: 16, y: 5, z: 0, q: [1, 0, 0, 0] }],
    ],
    frameMs: 50,
    results: [0],
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test('a coin result waits for the final pose to be painted and visibly settled', () => {
  const onSettled = vi.fn();
  render(
    <DiceTray
      throws={[{
        roll: { id: 'coin-roll', rolls: [{ faces: 2, v: 1 }] },
        x: 300,
        y: 200,
      }]}
      onThrowSettled={onSettled}
    />,
  );

  expect(onSettled).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(99));
  expect(onSettled).not.toHaveBeenCalled();

  act(() => vi.advanceTimersByTime(1));
  expect(onSettled).not.toHaveBeenCalled();

  // The next animation frame lets the browser paint the landed coin, then the
  // short hold keeps that resting pose visible before the result appears.
  act(() => vi.advanceTimersByTime(RESULT_REVEAL_HOLD_MS));
  expect(onSettled).not.toHaveBeenCalled();

  act(() => vi.advanceTimersByTime(1));
  expect(onSettled).toHaveBeenCalledOnce();
  expect(onSettled).toHaveBeenCalledWith('coin-roll');
});
