import { fireEvent, render, screen, within } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { vi } from 'vitest';
import { theme } from '../../../theme.js';
import DungeonPanel from './DungeonPanel.jsx';

const PLAN = {
  title: 'Ebonscar Castle',
  story: 'A castle on a lonely island.',
  rooms: [
    {
      id: 'room_1', number: 1, x: 0, y: 0, w: 5, h: 4, notes: [], rotunda: true,
    },
    {
      id: 'room_2', number: 2, x: 8, y: 2, w: 4, h: 6, notes: [{ text: 'A chest with a bat-shaped key.' }],
    },
  ],
  corridors: [{ x: 5, y: 2, w: 3, h: 1 }],
};

const KEY = {
  rooms: [
    {
      id: 'room_1',
      index: 1,
      popLabel: 'Frontier',
      slots: [{
        n: 1,
        type: 'Encounter',
        extra: { kind: 'enc', data: { diff: 'Hard', lv: 5, xp: 1100 } },
      }],
      loot: { data: { tipo: 'Coins', rarita: 'Rare' } },
      lootDc: { sum: 14 },
    },
    {
      id: 'room_2',
      index: 2,
      popLabel: 'Unexplored',
      slots: [{
        n: 1,
        type: 'Environment Damage',
        extra: { kind: 'trap', data: { tipo: 'Pit', dc: 13, danno: '2d6' } },
      }],
      loot: { data: { tipo: 'Nothing found' } },
      lootDc: null,
    },
  ],
};

const renderPanel = (props = {}) => render(
  <ThemeProvider theme={theme}>
    <DungeonPanel
      plan={PLAN}
      dungeonKey={KEY}
      placed={{}}
      partySize={4}
      onPopulate={() => {}}
      onPlaceRoom={() => {}}
      monstersForRoom={() => null}
      markersForRoom={() => []}
      {...props}
    />
  </ThemeProvider>,
);

// The map fills itself the first time it is opened, so the panel's job at that
// moment is to say what is happening rather than to offer a button.
test('a map preparing itself says so', () => {
  renderPanel({ dungeonKey: null, preparing: true });

  expect(screen.getByText(/filling the rooms and covering the map/i)).toBeInTheDocument();
  expect(screen.queryByText(/nothing rolled yet/i)).toBeNull();
});

test('an imported plan is listed room by room, before anything is rolled', () => {
  renderPanel({ dungeonKey: null });

  expect(screen.getByText('Ebonscar Castle')).toBeInTheDocument();
  expect(screen.getByText('2 rooms, 1 corridors')).toBeInTheDocument();
  expect(screen.getByText(/nothing rolled yet/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /roll the rooms/i })).toBeInTheDocument();
});

// The room count is the plan's, not a number typed into a box: that is the
// whole reason for reading the file.
test('rolling asks the engine for the rooms the plan actually has', () => {
  const onPopulate = vi.fn();
  renderPanel({ dungeonKey: null, onPopulate });

  fireEvent.click(screen.getByRole('button', { name: /roll the rooms/i }));
  expect(onPopulate).toHaveBeenCalledWith({ popMode: 'random', thr: 0, tier: 1 });
});

test('each room shows what was rolled in it, and what the generator wrote there', () => {
  renderPanel();

  expect(screen.getByText('Hard · Level 5 · 1,100 XP/PC'.replace('1,100', (1100).toLocaleString()))).toBeInTheDocument();
  expect(screen.getByText('Coins · Rare · DC 14')).toBeInTheDocument();
  expect(screen.getByText('Pit · DC 13 · 2d6')).toBeInTheDocument();
  // The generator's own note for that room sits on the same line of the key.
  expect(screen.getByText(/bat-shaped key/)).toBeInTheDocument();
  // "Nothing found" is not worth a line.
  expect(screen.queryByText(/nothing found/i)).toBeNull();
});

// The point of the exercise: a budget in experience becomes creatures in a room.
test('a room with an encounter offers the creatures it buys', () => {
  const onPlaceRoom = vi.fn();
  const monstersForRoom = (number) => (number === 1
    ? { budget: 4400, groups: [{ monster: { name: 'Ogre' }, count: 4, xp: 1800 }] }
    : null);
  renderPanel({ onPlaceRoom, monstersForRoom });

  expect(screen.getByText(/4 × Ogre/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /put 4 creatures on the map/i }));
  expect(onPlaceRoom).toHaveBeenCalledWith(1);
});

// A room with no fight in it still has a trap to put out, and the button has to
// exist for it — the trap is the reason that room is on the map.
test('a room with only a trap can still be put on the board', () => {
  const onPlaceRoom = vi.fn();
  renderPanel({
    onPlaceRoom,
    monstersForRoom: () => null,
    markersForRoom: (number) => (number === 2
      ? [{ kind: 'trap', iconKey: 'chevrons-down', label: 'Pit · DC 13 · 2d6' }]
      : []),
  });

  fireEvent.click(screen.getByRole('button', { name: /put a trap on the map/i }));
  expect(onPlaceRoom).toHaveBeenCalledWith(2);
});

test('creatures and markers are counted together on the button', () => {
  renderPanel({
    monstersForRoom: (number) => (number === 1
      ? { budget: 900, groups: [{ monster: { name: 'Ogre' }, count: 2, xp: 900 }] }
      : null),
    markersForRoom: (number) => (number === 1
      ? [
        { kind: 'trap', label: 'Pit · DC 13 · 2d6' },
        { kind: 'loot', label: 'Coins · Rare' },
      ]
      : []),
  });

  expect(screen.getByRole('button', { name: /put 2 creatures, a trap and a loot on the map/i }))
    .toBeInTheDocument();
});

test('a room already filled says so rather than pretending it is empty', () => {
  const monstersForRoom = () => ({ budget: 100, groups: [{ monster: { name: 'Rat' }, count: 2, xp: 20 }] });
  renderPanel({ monstersForRoom, placed: { room_1: ['a', 'b'] } });

  const rooms = screen.getAllByRole('button', { name: /put it out again/i });
  expect(within(rooms[0]).getByText('Put it out again (2 on the map)')).toBeInTheDocument();
});
