import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WeaponNoteBlock } from '../../../../../src/shared/character/combat/WeaponNoteBlock.jsx';

describe('WeaponNoteBlock', () => {
  test('shows the source, rule name and rule text of each weapon note', () => {
    render(
      <WeaponNoteBlock
        notes={[{
          key: 'gwm',
          tag: 'GWM',
          title: 'Heavy Weapon Mastery',
          source: 'Great Weapon Master',
          entries: ['The extra damage equals your Proficiency Bonus.'],
        }]}
      />,
    );

    expect(screen.getByText('Great Weapon Master — Heavy Weapon Mastery')).toBeTruthy();
    expect(screen.getByText(/extra damage equals your Proficiency Bonus/)).toBeTruthy();
  });

  test('renders nothing without notes', () => {
    const { container } = render(<WeaponNoteBlock notes={[]} />);
    expect(container.textContent).toBe('');
  });
});
