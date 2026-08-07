import { act, fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import TokenMenu from './TokenMenu.jsx';

test('the token menu uses compact controls and still saves condition changes', () => {
  const onSave = vi.fn();
  render(
    <TokenMenu
      token={{
        id: 'goblin-1',
        label: 'Goblin',
        layer: 'tokens',
        conditions: [],
        effects: [],
      }}
      anchor={{ x: 20, y: 20 }}
      onClose={vi.fn()}
      onSave={onSave}
      onDelete={vi.fn()}
    />,
  );

  const menu = screen.getByRole('menu');
  expect(getComputedStyle(menu.closest('.MuiPaper-root')).width).toBe('360px');

  const proneChip = screen.getByText('Prone').closest('.MuiChip-root');
  expect(getComputedStyle(proneChip).height).toBe('20px');
  fireEvent.click(proneChip);

  expect(onSave).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'goblin-1' }),
    expect.objectContaining({ conditions: ['prone'] }),
  );
});

test('a down character can change death saves and the third failure sets Dead', () => {
  const onSave = vi.fn();
  render(
    <TokenMenu
      token={{
        id: 'hero-1',
        characterId: 'character-1',
        label: 'Aria',
        hpCurrent: 0,
        hpMax: 20,
        deathSaves: { success: 1, fail: 2 },
        conditions: [],
        effects: [],
      }}
      anchor={{ x: 20, y: 20 }}
      onClose={vi.fn()}
      onSave={onSave}
      onDelete={vi.fn()}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Failure 3' }));

  expect(onSave).toHaveBeenLastCalledWith(
    expect.objectContaining({ id: 'hero-1' }),
    expect.objectContaining({
      hpCurrent: 0,
      deathSaves: { success: 1, fail: 3 },
      conditions: ['dead'],
    }),
  );
});

test('a dead character opens with three failures and closing cannot revive it', () => {
  const onSave = vi.fn();
  render(
    <TokenMenu
      token={{
        id: 'hero-dead',
        characterId: 'character-1',
        label: 'Aria',
        hpCurrent: 0,
        hpMax: 20,
        deathSaves: { success: 0, fail: 0 },
        conditions: ['dead'],
        effects: [],
      }}
      anchor={{ x: 20, y: 20 }}
      onClose={vi.fn()}
      onSave={onSave}
      onDelete={vi.fn()}
    />,
  );

  for (const value of [1, 2, 3]) {
    expect(screen.getByRole('button', { name: `Failure ${value}` })).toHaveAttribute('data-active', 'true');
  }

  fireEvent.blur(screen.getByRole('textbox', { name: 'Label' }));
  expect(onSave).toHaveBeenLastCalledWith(
    expect.objectContaining({ id: 'hero-dead' }),
    expect.objectContaining({
      hpCurrent: 0,
      conditions: ['dead'],
      deathSaves: { success: 0, fail: 3 },
    }),
  );
});

test('toggling Dead on a creature sends it to zero hit points', () => {
  const onSave = vi.fn();
  render(
    <TokenMenu
      token={{
        id: 'goblin-2',
        label: 'Goblin',
        hpCurrent: 7,
        hpMax: 7,
        conditions: [],
        effects: [],
      }}
      anchor={{ x: 20, y: 20 }}
      onClose={vi.fn()}
      onSave={onSave}
      onDelete={vi.fn()}
    />,
  );

  fireEvent.click(screen.getByText('Dead'));

  expect(onSave).toHaveBeenLastCalledWith(
    expect.objectContaining({ id: 'goblin-2' }),
    expect.objectContaining({ hpCurrent: 0, conditions: ['dead'] }),
  );
});

test('a piece on the GM layer opens already ticked as hidden, and clearing it reveals it', () => {
  const onVisibility = vi.fn();
  const { rerender } = render(
    <TokenMenu
      token={{
        id: 'trap-1',
        label: '',
        secretLabel: 'Pit · DC 13 · 2d6',
        layer: 'gm',
        iconKey: 'chevrons-down',
      }}
      anchor={{ x: 20, y: 20 }}
      onClose={vi.fn()}
      onSave={vi.fn()}
      onVisibility={onVisibility}
      onDelete={vi.fn()}
    />,
  );

  const hidden = screen.getByRole('checkbox', { name: 'Hidden from the players' });
  expect(hidden.checked).toBe(true);
  fireEvent.click(hidden);
  expect(onVisibility).toHaveBeenCalledWith(expect.objectContaining({ id: 'trap-1' }), false);

  // The tick follows the piece, not a local copy: a write that never landed
  // must not leave the menu claiming the trap is sprung.
  rerender(
    <TokenMenu
      token={{
        id: 'trap-1',
        label: '',
        secretLabel: 'Pit · DC 13 · 2d6',
        layer: 'tokens',
        iconKey: 'chevrons-down',
      }}
      anchor={{ x: 20, y: 20 }}
      onClose={vi.fn()}
      onSave={vi.fn()}
      onVisibility={onVisibility}
      onDelete={vi.fn()}
    />,
  );
  expect(screen.getByRole('checkbox', { name: 'Hidden from the players' }).checked).toBe(false);
});

test('a player never gets the visibility tick', () => {
  render(
    <TokenMenu
      token={{ id: 'trap-1', label: '', layer: 'gm', iconKey: 'chevrons-down' }}
      anchor={{ x: 20, y: 20 }}
      canEdit={false}
      onClose={vi.fn()}
      onSave={vi.fn()}
      onDelete={vi.fn()}
    />,
  );

  expect(screen.queryByRole('checkbox', { name: 'Hidden from the players' })).toBe(null);
});

test('a placed map object debounces color updates while the picker moves', () => {
  vi.useFakeTimers();
  const onObjectStyle = vi.fn();
  render(
    <TokenMenu
      token={{
        id: 'door-1',
        label: 'Door',
        layer: 'map',
        iconKey: 'door-open',
        color: '#e8c96a',
      }}
      anchor={{ x: 20, y: 20 }}
      onClose={vi.fn()}
      onSave={vi.fn()}
      onObjectStyle={onObjectStyle}
      onDelete={vi.fn()}
    />,
  );

  fireEvent.input(screen.getByLabelText('Object color'), { target: { value: '#3366ff' } });
  expect(onObjectStyle).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(180));

  expect(onObjectStyle).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'door-1' }),
    { color: '#3366ff' },
  );
  vi.useRealTimers();
});
