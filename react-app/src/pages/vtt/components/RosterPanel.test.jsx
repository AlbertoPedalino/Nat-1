import {
  fireEvent, render, screen, waitFor,
} from '@testing-library/react';
import { vi } from 'vitest';
import RosterPanel from './RosterPanel.jsx';

function pointer(type, {
  clientX, clientY, pointerId = 7, pointerType = 'touch', button = 0,
}) {
  const event = new MouseEvent(type, {
    bubbles: true, cancelable: true, clientX, clientY, button,
  });
  Object.defineProperties(event, {
    isPrimary: { value: true },
    pointerId: { value: pointerId },
    pointerType: { value: pointerType },
  });
  return event;
}

test('Pieces is transparent and starts dragging the character token preview with a mouse', () => {
  const onPlacementDragStart = vi.fn();
  const { container } = render(
    <RosterPanel
      roster={[{
        characterId: 'hero-1',
        name: 'Aria',
        color: '#7a5aa8',
        className: 'Wizard',
        portraitPath: null,
      }]}
      tokens={[]}
      activeLayer="tokens"
      onPlaceCharacter={vi.fn()}
      onAddToken={vi.fn()}
      onImportEncounter={vi.fn()}
      onPlaceMonster={vi.fn()}
      onPlacementDragStart={onPlacementDragStart}
    />,
  );

  expect(container.querySelector('.MuiPaper-root')).toBeNull();
  const preview = container.querySelector('[data-piece-preview]');
  expect(preview).toBeTruthy();
  expect(getComputedStyle(preview).borderColor).toBe('rgb(122, 90, 168)');
  expect(getComputedStyle(preview).borderWidth).toBe('5px');
  expect(preview.querySelector('[data-class-icon="Wizard"]')).toBeTruthy();
  expect(screen.queryByText('A')).not.toBeInTheDocument();

  const row = screen.getByText('Aria').parentElement;
  fireEvent(row, pointer('pointerdown', {
    clientX: 260, clientY: 80, pointerType: 'mouse',
  }));
  fireEvent(window, pointer('pointermove', {
    clientX: 220, clientY: 90, pointerType: 'mouse',
  }));

  expect(onPlacementDragStart).toHaveBeenCalledWith(expect.objectContaining({
    kind: 'character',
    characterId: 'hero-1',
    token: expect.objectContaining({ label: 'Aria', className: 'Wizard', w: 1, h: 1 }),
  }));
  fireEvent(window, pointer('pointerup', {
    clientX: 180, clientY: 100, pointerType: 'mouse',
  }));
});

test('an already placed character can be removed before placing it again', () => {
  const onPlaceCharacter = vi.fn();
  const onRemoveCharacter = vi.fn();
  const entry = {
    characterId: 'hero-1',
    name: 'Aria',
    color: '#7a5aa8',
    className: 'Wizard',
    portraitPath: null,
  };
  render(
    <RosterPanel
      roster={[entry]}
      tokens={[{ id: 'token-1', characterId: 'hero-1', x: 999, y: 999 }]}
      activeLayer="tokens"
      onPlaceCharacter={onPlaceCharacter}
      onRemoveCharacter={onRemoveCharacter}
      onAddToken={vi.fn()}
      onImportEncounter={vi.fn()}
      onPlaceMonster={vi.fn()}
      onPlacementDragStart={vi.fn()}
    />,
  );

  expect(screen.getByText('Aria').parentElement).not.toHaveAttribute('draggable');
  fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
  expect(onRemoveCharacter).toHaveBeenCalledWith(entry);
  expect(onPlaceCharacter).not.toHaveBeenCalled();
});

test('a character row starts and finishes placement with a touch pointer', () => {
  const onPlacementDragStart = vi.fn();
  const onPlacementDragEnd = vi.fn();
  render(
    <RosterPanel
      roster={[{
        characterId: 'hero-1',
        name: 'Aria',
        color: '#7a5aa8',
        className: 'Wizard',
        portraitPath: null,
      }]}
      tokens={[]}
      activeLayer="tokens"
      onPlaceCharacter={vi.fn()}
      onAddToken={vi.fn()}
      onImportEncounter={vi.fn()}
      onPlaceMonster={vi.fn()}
      onPlacementDragStart={onPlacementDragStart}
      onPlacementDragEnd={onPlacementDragEnd}
    />,
  );

  const row = screen.getByText('Aria').parentElement;
  fireEvent(row, pointer('pointerdown', { clientX: 260, clientY: 80 }));
  fireEvent(window, pointer('pointermove', { clientX: 220, clientY: 90 }));
  expect(onPlacementDragStart).toHaveBeenCalledWith(expect.objectContaining({
    kind: 'character', characterId: 'hero-1',
  }));

  fireEvent(window, pointer('pointerup', { clientX: 150, clientY: 100 }));
  expect(onPlacementDragEnd).toHaveBeenCalledOnce();
});

test('Add token piece can be dragged to an exact map position', () => {
  const onAddToken = vi.fn();
  const onPlacementDragStart = vi.fn();
  const onPlacementDragEnd = vi.fn();
  render(
    <RosterPanel
      roster={[]}
      tokens={[]}
      activeLayer="gm"
      onAddToken={onAddToken}
      onImportEncounter={vi.fn()}
      onPlaceMonster={vi.fn()}
      onPlacementDragStart={onPlacementDragStart}
      onPlacementDragEnd={onPlacementDragEnd}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Add GM piece' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Token name' }), {
    target: { value: 'Specter' },
  });
  const source = screen.getByRole('button', { name: 'Drag generic token to map' });
  fireEvent(source, pointer('pointerdown', {
    clientX: 260, clientY: 80, pointerType: 'mouse',
  }));
  fireEvent(window, pointer('pointermove', {
    clientX: 220, clientY: 90, pointerType: 'mouse',
  }));

  expect(onPlacementDragStart).toHaveBeenCalledWith({
    kind: 'token',
    token: {
      layer: 'gm', label: 'Specter', color: '#7a5aa8', w: 1, h: 1,
    },
  });
  expect(onAddToken).not.toHaveBeenCalled();

  fireEvent(window, pointer('pointerup', {
    clientX: 160, clientY: 110, pointerType: 'mouse',
  }));
  expect(onPlacementDragEnd).toHaveBeenCalledOnce();
});

test('the generic token editor sends its name and color to quick placement', () => {
  const onAddToken = vi.fn();
  render(
    <RosterPanel
      roster={[]}
      tokens={[]}
      activeLayer="tokens"
      onAddToken={onAddToken}
      onImportEncounter={vi.fn()}
      onPlaceMonster={vi.fn()}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Add token piece' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Token name' }), {
    target: { value: 'Villager' },
  });
  fireEvent.input(screen.getByLabelText('Token color'), { target: { value: '#336699' } });
  fireEvent.click(screen.getByRole('button', { name: 'Place' }));

  expect(onAddToken).toHaveBeenCalledWith({
    layer: 'tokens', label: 'Villager', color: '#336699', w: 1, h: 1,
  });
});

test('the generic token editor previews and submits an optional image', async () => {
  const onAddToken = vi.fn();
  const imageUrl = 'blob:token-preview';
  Object.defineProperties(URL, {
    createObjectURL: { configurable: true, value: vi.fn(() => imageUrl) },
    revokeObjectURL: { configurable: true, value: vi.fn() },
  });
  render(
    <RosterPanel
      roster={[]}
      tokens={[]}
      activeLayer="tokens"
      onAddToken={onAddToken}
      onImportEncounter={vi.fn()}
      onPlaceMonster={vi.fn()}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Add token piece' }));
  const file = new File(['portrait'], 'villager.png', { type: 'image/png' });
  fireEvent.change(screen.getByLabelText('Image'), { target: { files: [file] } });

  await waitFor(() => expect(document.querySelector(`img[src="${imageUrl}"]`)).toBeTruthy());
  fireEvent.click(screen.getByRole('button', { name: 'Place' }));
  expect(onAddToken).toHaveBeenCalledWith(expect.objectContaining({
    imageFile: file,
    imageUrl,
  }));
});

test('the Add token toggle clearly closes the expanded editor', () => {
  render(
    <RosterPanel
      roster={[]}
      tokens={[]}
      activeLayer="tokens"
      onAddToken={vi.fn()}
      onImportEncounter={vi.fn()}
      onPlaceMonster={vi.fn()}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Add token piece' }));
  expect(screen.getByRole('button', { name: 'Close token editor' })).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByRole('textbox', { name: 'Token name' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Close token editor' }));
  expect(screen.getByRole('button', { name: 'Add token piece' })).toHaveAttribute('aria-expanded', 'false');
});
