import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import InitiativeLaunchDialog from '../../../../../src/pages/encounterbuilder/builder/InitiativeLaunchDialog.jsx';

// One row per creature: only the second goblin is surprised.
const encounter = [{ monsterData: { name: 'Goblin' }, qty: 2 }];
const players = [{ name: 'Aria', activeEffects: [{ key: 'selfCheckAdv', duration: 'manual' }] }];

function open(onLaunch = vi.fn()) {
  render(<InitiativeLaunchDialog open onClose={vi.fn()} encounter={encounter} players={players} onLaunch={onLaunch} />);
  return onLaunch;
}

test('each creature has its own row, and only the chosen ones launch with a mode', () => {
  const onLaunch = open();
  expect(screen.getByText('Goblin A')).toBeInTheDocument();
  expect(screen.getByText('Goblin B')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Goblin B: disadvantage' }));
  fireEvent.click(screen.getByRole('button', { name: 'Launch' }));
  expect(onLaunch).toHaveBeenCalledWith({ 'monster:0:1': 'disadv' });
});

test('a side shortcut sets every row of that side, and a player shows what their own effects make it', () => {
  const onLaunch = open();
  expect(screen.getByText(/Own: Advantage · → Advantage/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'All monsters: disadvantage' }));
  fireEvent.click(screen.getByRole('button', { name: 'Aria: disadvantage' }));
  // Aria's own advantage and the surprise cancel.
  expect(screen.getByText(/Own: Advantage · → Straight roll/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Launch' }));
  expect(onLaunch).toHaveBeenCalledWith({ 'player:0': 'disadv', 'monster:0:0': 'disadv', 'monster:0:1': 'disadv' });
});
