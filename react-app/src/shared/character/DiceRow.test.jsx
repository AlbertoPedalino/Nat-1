import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import DiceRow from './DiceRow.jsx';

vi.mock('./Die3D.jsx', () => ({
  default: ({ faces }) => <div data-testid="polyhedral-die">d{faces}</div>,
}));

test('a toast row uses the lightweight orb for d100 and keeps other dice polyhedral', () => {
  render(
    <DiceRow
      dice={[
        { faces: 100, value: 73, color: '#edd48a' },
        { faces: 20, value: 17, color: '#edd48a' },
      ]}
      seed="mixed-roll"
      size={58}
    />,
  );

  expect(screen.getByRole('img', { name: 'd100 result 73' })).toHaveAttribute('data-die-shape', 'd100-orb');
  expect(screen.getByTestId('polyhedral-die')).toHaveTextContent('d20');
});
