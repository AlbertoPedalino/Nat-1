import { fireEvent, render, screen } from '@testing-library/react';
import { Pencil } from 'lucide-react';
import { vi } from 'vitest';
import SceneToolRail from './SceneToolRail.jsx';

test('a tool is activated by the same click that opens its options', () => {
  const activate = vi.fn();

  render(
    <SceneToolRail
      activeId="cursor"
      onCursor={vi.fn()}
      groups={[{
        id: 'draw',
        label: 'Draw',
        icon: Pencil,
        onActivate: activate,
        content: <div>Drawing options</div>,
      }]}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Draw' }));

  expect(activate).toHaveBeenCalledOnce();
  expect(screen.getByText('Drawing options')).toBeInTheDocument();
});

test('the cursor restores normal interaction and closes an open panel', () => {
  const useCursor = vi.fn();

  render(
    <SceneToolRail
      activeId="draw"
      onCursor={useCursor}
      groups={[{
        id: 'draw',
        label: 'Draw',
        icon: Pencil,
        onActivate: vi.fn(),
        content: <div>Drawing options</div>,
      }]}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Draw' }));
  fireEvent.click(screen.getByRole('button', { name: 'Normal cursor' }));

  expect(useCursor).toHaveBeenCalledOnce();
  expect(screen.queryByText('Drawing options')).not.toBeInTheDocument();
});

test('panel content can close the rail after completing an action', () => {
  render(
    <SceneToolRail
      groups={[{
        id: 'rolls',
        label: 'Rolls',
        icon: Pencil,
        content: ({ closePanel }) => <button type="button" onClick={closePanel}>Roll now</button>,
      }]}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Rolls' }));
  fireEvent.click(screen.getByRole('button', { name: 'Roll now' }));

  expect(screen.queryByRole('button', { name: 'Roll now' })).not.toBeInTheDocument();
});

test('the open panel fades in place while a piece is being positioned', () => {
  const props = {
    groups: [{
      id: 'pieces', label: 'Pieces', icon: Pencil, content: <div>Piece options</div>,
    }],
  };
  const { rerender } = render(<SceneToolRail {...props} />);
  fireEvent.click(screen.getByRole('button', { name: 'Pieces' }));

  const panel = screen.getByText('Piece options').closest('[data-viewport-control]');
  rerender(<SceneToolRail {...props} placing />);

  expect(panel).toHaveStyle({ opacity: 0, pointerEvents: 'none' });
  expect(panel.style.transform).toBe('');
});
