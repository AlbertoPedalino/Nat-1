import { fireEvent, render, screen } from '@testing-library/react';
import { iconNames } from 'lucide-react/dynamic';
import { vi } from 'vitest';
import MapObjectsPanel from './MapObjectsPanel.jsx';

test('the objects panel searches and paginates the complete Lucide catalog', () => {
  const onPlace = vi.fn();
  render(<MapObjectsPanel layer="gm" onPlace={onPlace} />);

  expect(screen.getByText(new RegExp(`^${new Set(iconNames).size} icons`))).toBeInTheDocument();
  expect(screen.getByRole('navigation')).toBeInTheDocument();

  fireEvent.change(screen.getByRole('textbox', { name: 'Search Lucide icons' }), {
    target: { value: 'zodiac virgo' },
  });
  fireEvent.input(screen.getByLabelText('Object color'), { target: { value: '#ff3355' } });
  fireEvent.change(screen.getByRole('slider', { name: 'Icon stroke width' }), {
    target: { value: '3.2' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Place Zodiac Virgo' }));

  expect(onPlace).toHaveBeenCalledWith(expect.objectContaining({
    key: 'zodiac-virgo',
    label: 'Zodiac Virgo',
    color: '#ff3355',
    strokeWidth: 3.2,
    layer: 'gm',
  }));
});

test('an object starts pointer placement with a mouse', () => {
  const onPlacementDragStart = vi.fn();
  const onPlacementDragEnd = vi.fn();
  render(
    <MapObjectsPanel
      layer="gm"
      onPlace={vi.fn()}
      onPlacementDragStart={onPlacementDragStart}
      onPlacementDragEnd={onPlacementDragEnd}
    />,
  );

  const source = screen.getAllByRole('button', { name: /^Place / })[0];
  const pointer = (type, clientX) => {
    const event = new MouseEvent(type, {
      bubbles: true, cancelable: true, button: 0, clientX, clientY: 80,
    });
    Object.defineProperties(event, {
      isPrimary: { value: true },
      pointerId: { value: 4 },
      pointerType: { value: 'mouse' },
    });
    return event;
  };

  fireEvent(source, pointer('pointerdown', 260));
  fireEvent(window, pointer('pointermove', 220));
  expect(onPlacementDragStart).toHaveBeenCalledWith(expect.objectContaining({
    kind: 'object',
    object: expect.objectContaining({ layer: 'gm' }),
  }));
  fireEvent(window, pointer('pointerup', 180));
  expect(onPlacementDragEnd).toHaveBeenCalledOnce();
});
