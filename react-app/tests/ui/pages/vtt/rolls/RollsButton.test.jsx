import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RollsButton from '../../../../../src/pages/vtt/rolls/RollsButton.jsx';

describe('RollsButton', () => {
  it('opens the roll log from the scene bar', () => {
    render(
      <RollsButton
        feed={[{
          id: 'roll-1',
          actorName: 'Arannis',
          label: 'Attack',
          detail: '1d20 [17] + 5',
          total: 22,
          rolls: [{ v: 17, faces: 20, kept: true }],
          bonus: 5,
        }]}
        onCustomRoll={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    expect(screen.queryByText('Attack')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Rolls' }));
    expect(screen.getByText('Attack')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Custom Roll' })).toBeInTheDocument();
  });
});
