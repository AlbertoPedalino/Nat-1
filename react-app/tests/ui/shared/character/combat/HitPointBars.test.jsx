import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import HitPointBars from '../../../../../src/shared/character/combat/HitPointBars.jsx';

// The share rides on the element as a custom property, never as a style rule
// of its own: one class for every bar, however many are on a map.
test('a bar carries its share on the element, the cushion only while there is one', () => {
  const { rerender } = render(<HitPointBars current={15} max={60} />);
  const hp = screen.getByRole('meter', { name: 'Hit points' });
  expect(hp.style.getPropertyValue('--meter-share')).toBe('0.25');
  expect(hp).toHaveAttribute('aria-valuetext', '15 of 60 hit points');
  expect(screen.queryByRole('meter', { name: 'Temporary hit points' })).toBeNull();

  rerender(<HitPointBars current={15} max={60} temp={90} />);
  const temp = screen.getByRole('meter', { name: 'Temporary hit points' });
  expect(temp.style.getPropertyValue('--meter-share')).toBe('1');
  expect(temp).toHaveAttribute('aria-valuetext', '90 temporary hit points');
});

test("a bar's figures ride inside it", () => {
  render(<HitPointBars current={7} max={10} hpFigures={<span>7/10</span>} />);
  expect(screen.getByRole('meter', { name: 'Hit points' })).toHaveTextContent('7/10');
});
