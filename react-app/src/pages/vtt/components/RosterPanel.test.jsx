import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import RosterPanel from './RosterPanel.jsx';
import { PIECE_DRAG_TYPE } from './PiecePreview.jsx';

test('Pieces is transparent and starts dragging the character token preview', () => {
  const onPlacementDragStart = vi.fn();
  const dataTransfer = {
    setData: vi.fn(),
    setDragImage: vi.fn(),
    effectAllowed: '',
  };
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

  const row = screen.getByText('Aria').closest('[draggable="true"]');
  fireEvent.dragStart(row, { dataTransfer });

  expect(dataTransfer.setData).toHaveBeenCalledWith(PIECE_DRAG_TYPE, 'piece');
  expect(dataTransfer.setDragImage).toHaveBeenCalledOnce();
  expect(onPlacementDragStart).toHaveBeenCalledWith(expect.objectContaining({
    kind: 'character',
    characterId: 'hero-1',
    token: expect.objectContaining({ label: 'Aria', className: 'Wizard', w: 1, h: 1 }),
  }));
});
