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
