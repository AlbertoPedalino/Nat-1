import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import TokenSprite from './TokenSprite.jsx';

test('hovering a token condition pill shows its rules text', async () => {
  const user = userEvent.setup();
  render(
    <TokenSprite
      token={{
        id: 'goblin-1',
        label: 'Goblin',
        layer: 'tokens',
        conditions: ['prone'],
        effects: [],
      }}
      size={64}
      interactive
      movable={false}
      conditionEntries={{
        prone: ['The creature has Disadvantage on attack rolls.'],
      }}
    />,
  );

  fireEvent.pointerEnter(screen.getByRole('button', { name: 'Goblin' }));
  await user.hover(screen.getByText('Prone'));

  expect(await screen.findByText('The creature has Disadvantage on attack rolls.')).toBeInTheDocument();
});

test('condition pills stay open while the pointer crosses from the token to them', () => {
  vi.useFakeTimers();
  const { unmount } = render(
    <TokenSprite
      token={{
        id: 'goblin-1',
        label: 'Goblin',
        layer: 'tokens',
        conditions: ['prone'],
        effects: [],
      }}
      size={64}
      interactive
      movable={false}
      conditionEntries={{ prone: ['Prone rules'] }}
    />,
  );

  const token = screen.getByRole('button', { name: 'Goblin' });
  fireEvent.pointerEnter(token);
  const pill = screen.getByText('Prone');
  fireEvent.pointerLeave(token);
  fireEvent.pointerEnter(pill);
  act(() => vi.advanceTimersByTime(200));

  expect(screen.getByText('Prone')).toBeInTheDocument();
  unmount();
  vi.useRealTimers();
});

test('condition pills collapse while their token is being dragged', () => {
  render(
    <TokenSprite
      token={{
        id: 'goblin-1',
        label: 'Goblin',
        layer: 'tokens',
        conditions: ['prone'],
        effects: [],
      }}
      size={64}
      interactive
      movable
      conditionEntries={{ prone: ['Prone rules'] }}
    />,
  );

  const token = screen.getByRole('button', { name: 'Goblin' });
  fireEvent.pointerEnter(token);
  expect(screen.getByText('Prone')).toBeInTheDocument();

  fireEvent.pointerDown(token, { button: 0 });

  expect(screen.queryByText('Prone')).not.toBeInTheDocument();
  expect(screen.getByText('1')).toBeInTheDocument();
});
