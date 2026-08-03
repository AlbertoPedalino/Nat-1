import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import RollLogPanel from './RollLogPanel.jsx';

describe('RollLogPanel', () => {
  it('shows landed values as static two-dimensional die faces', () => {
    const { container } = render(
      <RollLogPanel
        feed={[{
          id: 'roll-1',
          actorName: 'Arannis',
          label: 'Attack',
          detail: '1d20 [17] + 5',
          total: 22,
          rolls: [{ v: 17, faces: 20, kept: true }],
          bonus: 5,
        }]}
      />,
    );

    expect(screen.getByRole('img', { name: 'd20 showing 17' })).toBeInTheDocument();
    expect(container.querySelector('[data-die-face="2d"]')).toBeInTheDocument();
  });
});
