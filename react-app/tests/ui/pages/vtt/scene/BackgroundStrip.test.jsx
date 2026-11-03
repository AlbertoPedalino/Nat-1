import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, vi } from 'vitest';

vi.mock('../../../../../src/shared/cloud/api/vtt.js', () => ({
  signMapImage: vi.fn(async (path) => `signed:${path}`),
}));

const { default: BackgroundStrip } = await import('../../../../../src/pages/vtt/scene/BackgroundStrip.jsx');

beforeEach(() => {
  window.localStorage.clear();
});

function renderStrip(props = {}) {
  const handlers = { onSelect: vi.fn(), onAdd: vi.fn(), onRemove: vi.fn() };
  render(
    <BackgroundStrip
      backgrounds={['day.webp', 'dusk.webp', 'night.webp']}
      selected="dusk.webp"
      {...handlers}
      {...props}
    />,
  );
  return handlers;
}

test('a thumbnail and the arrows pick a background, wrapping round the ends', () => {
  const { onSelect } = renderStrip({ selected: 'night.webp' });
  expect(screen.getByRole('button', { name: 'Show background 3' })).toHaveAttribute('aria-pressed', 'true');

  fireEvent.click(screen.getByRole('button', { name: 'Show background 1' }));
  expect(onSelect).toHaveBeenLastCalledWith('day.webp');
  fireEvent.click(screen.getByRole('button', { name: 'Next background' }));
  expect(onSelect).toHaveBeenLastCalledWith('day.webp');
  fireEvent.click(screen.getByRole('button', { name: 'Previous background' }));
  expect(onSelect).toHaveBeenLastCalledWith('dusk.webp');
  fireEvent.keyDown(screen.getByRole('group', { name: 'Backgrounds' }), { key: 'ArrowRight' });
  expect(onSelect).toHaveBeenLastCalledWith('day.webp');
});

test('removing a background deletes it only on the second click', () => {
  const { onRemove } = renderStrip();
  fireEvent.click(screen.getByRole('button', { name: 'Remove background 2' }));
  expect(onRemove).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm removing background 2' }));
  expect(onRemove).toHaveBeenCalledWith('dusk.webp');
});

test('a single background has no arrows, and the add tile takes a file', () => {
  const { onAdd } = renderStrip({ backgrounds: ['day.webp'], selected: 'day.webp' });
  expect(screen.queryByRole('button', { name: 'Next background' })).toBeNull();
  const file = new File(['x'], 'room.png', { type: 'image/png' });
  const input = document.querySelector('input[type="file"]');
  fireEvent.change(input, { target: { files: [file] } });
  expect(onAdd).toHaveBeenCalledWith(file);
});

test('the slider folds to a small button and opens again, and remembers it', () => {
  renderStrip();
  fireEvent.click(screen.getByRole('button', { name: 'Hide the backgrounds' }));
  expect(screen.queryByRole('group', { name: 'Backgrounds' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Show the backgrounds' })).toHaveTextContent('2 / 3');
  expect(window.localStorage.getItem('gb:vtt:background-strip-collapsed')).toBe('1');

  fireEvent.click(screen.getByRole('button', { name: 'Show the backgrounds' }));
  expect(screen.getByRole('group', { name: 'Backgrounds' })).toBeInTheDocument();
  expect(window.localStorage.getItem('gb:vtt:background-strip-collapsed')).toBe('0');
});
