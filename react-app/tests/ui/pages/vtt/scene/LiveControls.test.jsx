import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import LiveControls from '../../../../../src/pages/vtt/scene/LiveControls.jsx';

const handlers = () => ({
  onToggleLive: vi.fn(),
  onToggleFreeze: vi.fn(),
  onOpenProjector: vi.fn(),
  onStopProjector: vi.fn(),
});

test('a scene that is not live offers only Go live, which goes live at once', () => {
  const on = handlers();
  render(<LiveControls isLive={false} projectorFollowing projectorAttached={false} {...on} />);

  expect(screen.queryByRole('button', { name: 'Freeze view' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Go live' }));
  expect(on.onToggleLive).toHaveBeenCalledOnce();
  expect(screen.queryByRole('menu')).toBeNull();
});

// Freeze is pressed again and again in a session, so it stays one click away;
// the projector and going off air wait behind Live.
test('a live scene keeps Freeze in view and the projector and Stop live in the menu', () => {
  const on = handlers();
  render(<LiveControls isLive projectorFollowing projectorAttached={false} {...on} />);

  fireEvent.click(screen.getByRole('button', { name: 'Freeze view' }));
  expect(on.onToggleFreeze).toHaveBeenCalledOnce();

  fireEvent.click(screen.getByRole('button', { name: 'Live' }));
  expect(on.onToggleLive).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('menuitem', { name: 'Projector mode' }));
  expect(on.onOpenProjector).toHaveBeenCalledOnce();

  fireEvent.click(screen.getByRole('button', { name: 'Live' }));
  fireEvent.click(screen.getByRole('menuitem', { name: /stop live/i }));
  expect(on.onToggleLive).toHaveBeenCalledOnce();
});

test('with a projector attached the menu stops it instead of opening another', () => {
  const on = handlers();
  render(<LiveControls isLive projectorFollowing={false} projectorAttached {...on} />);

  expect(screen.getByRole('button', { name: 'Unfreeze view' })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Live' }));
  expect(screen.queryByRole('menuitem', { name: 'Projector mode' })).toBeNull();
  fireEvent.click(screen.getByRole('menuitem', { name: /stop projector mode/i }));
  expect(on.onStopProjector).toHaveBeenCalledOnce();
});
