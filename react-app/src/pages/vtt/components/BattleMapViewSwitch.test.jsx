import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BattleMapViewSwitch from './BattleMapViewSwitch.jsx';

const choices = [
  { characterId: 'c1', name: 'Arannis' },
  { characterId: 'c2', name: 'Bryn' },
];

describe('BattleMapViewSwitch', () => {
  it('opens the sheet from a compact button', () => {
    const onViewChange = vi.fn();
    render(
      <BattleMapViewSwitch
        view="map"
        choices={choices}
        selectedId="c1"
        onViewChange={onViewChange}
        onSelectionChange={() => {}}
      />,
    );

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show character sheet' }));
    expect(onViewChange).toHaveBeenCalledWith('sheet');
  });

  it('lets a GM choose a campaign character and close the sheet panel', () => {
    const onViewChange = vi.fn();
    const onSelectionChange = vi.fn();
    render(
      <BattleMapViewSwitch
        view="sheet"
        choices={choices}
        selectedId="c1"
        onViewChange={onViewChange}
        onSelectionChange={onSelectionChange}
      />,
    );

    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: 'Bryn' }));
    expect(onSelectionChange).toHaveBeenCalledWith('c2');

    fireEvent.click(screen.getByRole('button', { name: 'Hide character sheet' }));
    expect(onViewChange).toHaveBeenCalledWith('map');
  });

  it('disables sheet view when the user owns no campaign character', () => {
    render(
      <BattleMapViewSwitch
        view="map"
        choices={[]}
        selectedId={null}
        onViewChange={() => {}}
        onSelectionChange={() => {}}
      />,
    );

    expect(screen.getByRole('button', { name: 'Show character sheet' })).toBeDisabled();
  });
});
