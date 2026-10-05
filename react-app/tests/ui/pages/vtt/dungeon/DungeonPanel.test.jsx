import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { vi } from 'vitest';
import { theme } from '../../../../../src/app/theme.js';
import DungeonPanel from '../../../../../src/pages/vtt/dungeon/DungeonPanel.jsx';

const KEY = {
  id: 'dungeon_abc',
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
      dungeonKey={KEY}
      fights={{}}
      partySize={4}
      title="Ebonscar"
      onRoll={() => {}}
      onClear={() => {}}
      monstersForRoom={() => null}
      markersForRoom={() => []}
      {...props}
    />
  </ThemeProvider>,
);

const drag = (element) => {
  const pointer = (type, clientX) => {
    const event = new MouseEvent(type, {
      bubbles: true, cancelable: true, button: 0, clientX, clientY: 80,
    });
    Object.defineProperties(event, {
      isPrimary: { value: true },
      pointerId: { value: 3 },
      pointerType: { value: 'mouse' },
    });
    return event;
  };
  fireEvent(element, pointer('pointerdown', 260));
  fireEvent(window, pointer('pointermove', 220));
  fireEvent(window, pointer('pointerup', 180));
};

// Nothing is read from the picture, which is the whole point: the same panel
// serves a cave, a dwelling and a map drawn on paper.
test('an unrolled map asks how many rooms it has', () => {
  const onRoll = vi.fn();
  renderPanel({ dungeonKey: null, onRoll });

  expect(screen.getByText(/nothing is read from the picture/i)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Rooms'), { target: { value: '12' } });
  fireEvent.click(screen.getByRole('button', { name: /roll the dungeon/i }));

  expect(onRoll).toHaveBeenCalledWith({
    roomCount: 12, popMode: 'random', thr: 0, tier: 1,
  });
});

test('a room count the engine would refuse cannot be rolled', () => {
  renderPanel({ dungeonKey: null });

  fireEvent.change(screen.getByLabelText('Rooms'), { target: { value: '0' } });
  expect(screen.getByRole('button', { name: /roll the dungeon/i })).toBeDisabled();

  fireEvent.change(screen.getByLabelText('Rooms'), { target: { value: '99' } });
  expect(screen.getByRole('button', { name: /roll the dungeon/i })).toBeDisabled();
});

test('each room shows what was rolled in it', () => {
  renderPanel();

  expect(screen.getByText(`Hard · Level 5 · ${(1100).toLocaleString()} XP/PC`)).toBeInTheDocument();
  expect(screen.getByText('Coins · Rare · DC 14')).toBeInTheDocument();
  expect(screen.getByText('Pit · DC 13 (detect & disarm) · 2d6')).toBeInTheDocument();
  // "Nothing found" is not worth a line.
  expect(screen.queryByText(/nothing found/i)).toBeNull();
});

// The creatures are worth nothing until something is tracking their hit points,
// and the fight that does the tracking is written by the drop. The GM used to
// have to press a button first, then come back and drag the same room.
test('a room rolled but never sent is dragged as the room itself', () => {
  const onPlacementDragStart = vi.fn();
  const monstersForRoom = (number) => (number === 1
    ? { budget: 4400, groups: [{ monster: { name: 'Ogre' }, count: 4, xp: 1800 }] }
    : null);
  renderPanel({ monstersForRoom, onPlacementDragStart });

  expect(screen.getByText(/4 × Ogre/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /send to the encounter builder/i })).toBeNull();

  drag(screen.getByText(/drag onto the map/i).closest('div'));

  expect(onPlacementDragStart).toHaveBeenCalledWith(expect.objectContaining({
    kind: 'encounter',
    layer: 'tokens',
    roomNumber: 1,
    roomTitle: 'Ebonscar',
  }));
  // Nothing to point at yet: the fight is made where it lands.
  expect(onPlacementDragStart.mock.calls[0][0].fightId).toBeUndefined();
});

test('a room already sent drags as the room, which is what can tell a live fight from a deleted one', () => {
  const onPlacementDragStart = vi.fn();
  const monstersForRoom = (number) => (number === 1
    ? { budget: 900, groups: [{ monster: { name: 'Ogre' }, count: 2, xp: 900 }] }
    : null);
  renderPanel({
    monstersForRoom,
    onPlacementDragStart,
    fights: {
      room_1: {
        instanceId: 'enc-1', fightId: 'fight-7', name: 'Ebonscar — room 1', combatants: [{ id: 0 }],
      },
    },
  });

  // The name of the fight it was sent as is still what the row reads.
  expect(screen.getByText(/Ebonscar — room 1/)).toBeInTheDocument();

  drag(screen.getByText(/drag onto the map/i).closest('div'));

  expect(onPlacementDragStart).toHaveBeenCalledWith(expect.objectContaining({
    kind: 'encounter',
    layer: 'tokens',
    roomNumber: 1,
    roomTitle: 'Ebonscar',
  }));
});

test('a trap is dragged out as a GM-layer marker with its numbers on it', () => {
  const onPlacementDragStart = vi.fn();
  renderPanel({
    markersForRoom: (number) => (number === 2
      ? [{ kind: 'trap', iconKey: 'chevrons-down', label: 'Pit · DC 13 (detect & disarm) · 2d6' }]
      : []),
    onPlacementDragStart,
  });

  drag(screen.getAllByText('Pit · DC 13 (detect & disarm) · 2d6').at(-1));

  // `key` is the field the map's object placement reads; called `iconKey` it
  // dragged fine and landed nowhere.
  expect(onPlacementDragStart).toHaveBeenCalledWith(expect.objectContaining({
    kind: 'object',
    object: expect.objectContaining({
      key: 'chevrons-down',
      label: 'Pit · DC 13 (detect & disarm) · 2d6',
      layer: 'gm',
      // The DC travels as a secret, so showing the trap to the party later
      // shows them the icon and not what they are rolling against.
      secretLabel: true,
    }),
  }));
});

// Without the link there is nowhere to send a fight, and the GM has to be told
// where to make it rather than left wondering why nothing happens.
test('a map with no Encounter Builder linked says what to link', () => {
  renderPanel({ linkHint: 'That GM Board is not linked to an Encounter Builder.' });
  expect(screen.getByText(/not linked to an encounter builder/i)).toBeInTheDocument();
});
