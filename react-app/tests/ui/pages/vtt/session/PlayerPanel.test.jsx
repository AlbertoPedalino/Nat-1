import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PlayerPanel from '../../../../../src/pages/vtt/session/PlayerPanel.jsx';

describe('PlayerPanel', () => {
  it('gives a player the same token composer as the GM, picture included', () => {
    const onAddToken = vi.fn();
    render(
      <PlayerPanel
        roster={[]}
        tokens={[]}
        ownedCharacterIds={[]}
        busy={false}
        onPlaceCharacter={vi.fn()}
        onAddToken={onAddToken}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add token piece' }));
    expect(screen.getByText('Image')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Token name'), { target: { value: 'Trap here' } });
    fireEvent.click(screen.getByRole('button', { name: 'Place' }));

    expect(onAddToken).toHaveBeenCalledWith(expect.objectContaining({
      layer: 'tokens',
      label: 'Trap here',
    }));
  });
});
