import { act, fireEvent, render as baseRender, screen, waitFor, within } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { vi } from 'vitest';
import { theme } from '../../../../../src/app/theme.js';
import DrawingMenu from '../../../../../src/pages/vtt/map/DrawingMenu.jsx';

function render(ui) {
  return baseRender(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

const fireArea = {
  id: 'area-1',
  points: [{ x: 2, y: 2 }, { x: 6, y: 2 }],
  color: '#ff7a2a',
  width: 3,
  text: 'Fireball',
  area: { shape: 'circle', filled: true, effect: 'fire' },
  hiddenFromPlayers: false,
};

function menuProps(overrides = {}) {
  return {
    anchor: { x: 20, y: 20 },
    feetPerCell: 5,
    onClose: vi.fn(),
    onPreview: vi.fn(),
    onSave: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  };
}

test('an area menu edits its label, resizes it in feet, hides it and deletes it', async () => {
  const props = menuProps({ onVisibility: vi.fn() });
  render(<DrawingMenu drawing={fireArea} {...props} />);

  expect(screen.getByText('Circle · Fire')).toBeInTheDocument();

  const label = screen.getByRole('textbox', { name: 'Label' });
  expect(label).toHaveValue('Fireball');
  fireEvent.change(label, { target: { value: 'Wall of Fire' } });
  fireEvent.blur(label);
  expect(props.onSave).toHaveBeenLastCalledWith(fireArea, { text: 'Wall of Fire' });

  // 20 ft radius on a 5 ft grid, resized to 30 ft: the origin stays put.
  const size = screen.getByRole('spinbutton', { name: 'Radius (ft)' });
  expect(size).toHaveValue(20);
  fireEvent.change(size, { target: { value: '30' } });
  // Shown on the next frame, not per keystroke.
  await waitFor(() => expect(props.onPreview).toHaveBeenLastCalledWith(
    fireArea,
    { points: [{ x: 2, y: 2 }, { x: 8, y: 2 }] },
  ));

  fireEvent.click(screen.getByRole('checkbox', { name: 'Hidden from the players' }));
  expect(props.onVisibility).toHaveBeenCalledWith(fireArea, true);

  fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
  expect(props.onDelete).toHaveBeenCalledWith(fireArea);
  expect(props.onClose).toHaveBeenCalled();
});

test('a player gets no hide control, and a stroke is labelled and scaled rather than sized in feet', async () => {
  const stroke = {
    id: 'stroke-1',
    points: [{ x: 0, y: 0 }, { x: 4, y: 2 }],
    color: '#e8c96a',
    width: 3,
    text: null,
    area: null,
  };
  const props = menuProps();
  render(<DrawingMenu drawing={stroke} {...props} />);

  expect(screen.queryByRole('checkbox', { name: 'Hidden from the players' })).not.toBeInTheDocument();
  expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();

  const label = screen.getByRole('textbox', { name: 'Label' });
  fireEvent.change(label, { target: { value: 'To the vault' } });
  fireEvent.blur(label);
  expect(props.onSave).toHaveBeenLastCalledWith(stroke, { text: 'To the vault' });

  // The slider's top is four times the size, about the middle of the stroke.
  fireEvent.keyDown(screen.getByRole('slider', { name: 'Size' }), { key: 'End' });
  await waitFor(() => expect(props.onPreview).toHaveBeenLastCalledWith(stroke, {
    points: [{ x: -6, y: -3 }, { x: 10, y: 5 }],
  }));
});

test('an area changes its effect from the menu, taking the effect colour', () => {
  const props = menuProps();
  render(<DrawingMenu drawing={fireArea} {...props} />);
  fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Effect' }));
  fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'Poison' }));
  expect(props.onSave).toHaveBeenLastCalledWith(fireArea, {
    area: { shape: 'circle', filled: true, effect: 'poison' },
    color: '#7cc444',
  });
});

test('a dot takes no label: words on it would turn it into a note', () => {
  const dot = { id: 'dot-1', points: [{ x: 1, y: 1 }], color: '#e8c96a', width: 3, text: null, area: null };
  render(<DrawingMenu drawing={dot} {...menuProps()} />);
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
});

test('a note cannot be emptied into an invisible mark', () => {
  const note = { id: 'note-1', points: [{ x: 1, y: 1 }], color: '#e8c96a', width: 3, text: 'Trap', area: null };
  const props = menuProps();
  render(<DrawingMenu drawing={note} {...props} />);
  const text = screen.getByRole('textbox', { name: 'Text' });
  fireEvent.change(text, { target: { value: '   ' } });
  fireEvent.blur(text);
  expect(props.onSave).not.toHaveBeenCalled();
});

// On a phone the keyboard shortened the window as soon as the label was
// tapped, and the menu was clamped back inside it: one opened low jumped up
// under the thumb. Pinned to the top it stopped jumping but left the press.
// Now it opens at the press, stays there, and is lifted only as far as the
// keyboard would cover the field being typed into.
test('on a touch screen the menu opens at the press and only rises to clear the keyboard', async () => {
  const matchMedia = vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
    matches: query === '(pointer: coarse)',
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  }));
  const listeners = {};
  const keyboard = {
    offsetTop: 0,
    height: window.innerHeight,
    addEventListener: (type, run) => { listeners[type] = run; },
    removeEventListener: vi.fn(),
  };
  Object.defineProperty(window, 'visualViewport', { value: keyboard, configurable: true });
  try {
    render(<DrawingMenu drawing={fireArea} {...menuProps({ anchor: { x: 300, y: 600 } })} />);
    const paper = document.querySelector('.MuiMenu-paper');
    await waitFor(() => expect(paper.style.top).toBe('600px'));
    expect(paper.style.left).toBe('300px');

    // The keyboard comes up over the bottom of the screen and the label is
    // tapped: the field, 100px below the menu's top, would sit under it.
    const label = screen.getByRole('textbox', { name: 'Label' });
    vi.spyOn(label, 'getBoundingClientRect').mockImplementation(() => ({
      top: 0, left: 0, right: 0, width: 0, height: 0,
      bottom: Number.parseFloat(paper.style.top) + 100,
    }));
    keyboard.height = 400;
    act(() => { label.focus(); });
    // Lifted until the field's bottom is just above the keyboard (400 - 8).
    expect(paper.style.top).toBe('292px');
    // Typing does not move it.
    fireEvent.change(label, { target: { value: 'Wall of Fire' } });
    expect(paper.style.top).toBe('292px');

    // The keyboard goes: back where it was pressed.
    keyboard.height = window.innerHeight;
    act(() => { listeners.resize(); });
    expect(paper.style.top).toBe('600px');
  } finally {
    matchMedia.mockRestore();
    delete window.visualViewport;
  }
});
