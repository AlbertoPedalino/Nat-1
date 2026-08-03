import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, vi } from 'vitest';
import FloatingSheetPanel from './FloatingSheetPanel.jsx';

beforeAll(() => {
  window.PointerEvent = MouseEvent;
});

test('the fullscreen sheet panel can move partly outside the map and be resized', async () => {
  const container = document.createElement('div');
  const containerRef = { current: container };
  container.getBoundingClientRect = vi.fn(() => ({
    left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600,
  }));

  const { container: rendered } = render(
    <FloatingSheetPanel
      choices={[{ characterId: 'aria', name: 'Aria' }]}
      selectedId="aria"
      onSelectionChange={() => {}}
      onClose={() => {}}
      containerRef={containerRef}
    >
      <div>Character content</div>
    </FloatingSheetPanel>,
  );

  const panel = rendered.querySelector('[data-floating-sheet]');
  panel.getBoundingClientRect = vi.fn(() => ({
    left: 168, top: 50, right: 788, bottom: 470, width: 620, height: 420,
  }));
  const handle = screen.getByText('Sheet').parentElement;

  fireEvent.pointerDown(handle, { button: 0, pointerId: 4, clientX: 200, clientY: 60 });
  fireEvent.pointerMove(handle, { pointerId: 4, clientX: 300, clientY: 160 });
  fireEvent.pointerUp(handle, { pointerId: 4, clientX: 300, clientY: 160 });

  await waitFor(() => {
    expect(panel.style.left).toBe('268px');
    expect(panel.style.top).toBe('150px');
    expect(panel.style.right).toBe('auto');
  });

  const resize = screen.getByRole('button', { name: 'Resize floating sheet' });
  fireEvent.pointerDown(resize, { button: 0, pointerId: 5, clientX: 300, clientY: 200 });
  fireEvent.pointerMove(resize, { pointerId: 5, clientX: 400, clientY: 300 });
  fireEvent.pointerUp(resize, { pointerId: 5, clientX: 400, clientY: 300 });

  await waitFor(() => {
    expect(panel.style.width).toBe('720px');
    expect(panel.style.height).toBe('520px');
  });
});
