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

  it('omits a zero modifier from a stat roll', () => {
    render(
      <RollLogPanel
        feed={[{
          id: 'roll-zero',
          actorName: 'Arannis',
          label: 'Strength Check',
          detail: 'd20 = 12',
          total: 12,
          rolls: [{ v: 12, faces: 20, kept: true }],
          bonus: 0,
        }]}
      />,
    );

    expect(screen.getByText('d20 = 12')).toBeInTheDocument();
    expect(screen.queryByText(/\+\s*0/)).not.toBeInTheDocument();
  });
});
