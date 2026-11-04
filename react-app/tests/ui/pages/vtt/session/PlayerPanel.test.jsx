import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PlayerPanel from '../../../../../src/pages/vtt/session/PlayerPanel.jsx';

describe('PlayerPanel', () => {
  it('lets a player name and colour a marker of their own, without a picture', () => {
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

    fireEvent.click(screen.getByRole('button', { name: 'Add a marker' }));
    expect(screen.queryByText('Image')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Token name'), { target: { value: 'Trap here' } });
    fireEvent.click(screen.getByRole('button', { name: 'Place' }));

    expect(onAddToken).toHaveBeenCalledWith(expect.objectContaining({
      layer: 'tokens',
      label: 'Trap here',
    }));
    expect(onAddToken.mock.calls[0][0]).not.toHaveProperty('imageFile');
  });
});
