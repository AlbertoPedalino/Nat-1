import { fireEvent, render, screen, within } from '@testing-library/react';
import { vi } from 'vitest';
import InitiativeStrip, { InitiativeButton } from '../../../../../src/pages/vtt/initiative/InitiativeStrip.jsx';

const entries = [
  { key: 'a', order: 1, active: false, name: 'Goblin A', onBoard: true, hiddenFromPlayers: false },
  { key: 'b', order: 2, active: true, name: 'Goblin Boss', onBoard: true, hiddenFromPlayers: true },
  { key: 'c', order: 3, active: false, name: 'Hero', onBoard: true, hiddenFromPlayers: false, dead: true },
];
const choices = [
  { key: 'inst:77', instanceId: 'inst', fightId: '77', name: 'Ambush' },
  { key: 'inst:12', instanceId: 'inst', fightId: '12', name: 'Bridge' },
];

test('players see the order and the round, with no controls', () => {
  render(<InitiativeStrip entries={entries} round={2} />);
  const order = screen.getByRole('list', { name: 'Initiative order' });
  expect(within(order).getAllByRole('listitem').map((item) => item.getAttribute('title')))
    .toEqual(['Goblin A', 'Goblin Boss', 'Hero (dead)']);
  expect(within(order).getByText('Goblin Boss').closest('li')).toHaveAttribute('aria-current', 'step');
  expect(screen.getByText('Round 2')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Next turn' })).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Hidden from players')).not.toBeInTheDocument();
});

test('nothing is drawn with nothing to show', () => {
  const { container } = render(<InitiativeStrip entries={[]} round={null} />);
  expect(container).toBeEmptyDOMElement();
});

test('the GM steps the turn and picks or hides the shown fight', () => {
  const onStep = vi.fn();
  const onChoose = vi.fn();
  render(
    <InitiativeStrip
      entries={entries}
      round={2}
      controls
      choices={choices}
      selectedKey="inst:77"
      onStep={onStep}
      onChoose={onChoose}
    />,
  );
  expect(screen.getByLabelText('Hidden from players')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Next turn' }));
  fireEvent.click(screen.getByRole('button', { name: 'Previous turn' }));
  expect(onStep.mock.calls).toEqual([[1], [-1]]);

  fireEvent.click(screen.getByRole('button', { name: 'Choose the fight shown' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Bridge' }));
  expect(onChoose).toHaveBeenLastCalledWith(choices[1]);
  fireEvent.click(screen.getByRole('button', { name: 'Choose the fight shown' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Hide initiative' }));
  expect(onChoose).toHaveBeenLastCalledWith(null);
});

test('with none shown the map carries nothing; the scene actions offer the fights', () => {
  const onChoose = vi.fn();
  const { container } = render(<InitiativeStrip entries={[]} controls choices={choices} onChoose={onChoose} />);
  expect(container).toBeEmptyDOMElement();

  render(<InitiativeButton choices={choices} onChoose={onChoose} />);
  fireEvent.click(screen.getByRole('button', { name: 'Initiative' }));
  expect(screen.queryByRole('menuitem', { name: 'Hide initiative' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('menuitem', { name: 'Ambush' }));
  expect(onChoose).toHaveBeenCalledWith(choices[0]);
});

test('no fights from the board, no button', () => {
  const { container } = render(<InitiativeButton choices={[]} />);
  expect(container).toBeEmptyDOMElement();
});

test('steps are blocked while one is in flight', () => {
  const onStep = vi.fn();
  render(<InitiativeStrip entries={entries} controls busy onStep={onStep} />);
  expect(screen.getByRole('button', { name: 'Next turn' })).toBeDisabled();
});

test('the GM opens a creature from its entry, and drags one not on the board yet', () => {
  const onEntryClick = vi.fn();
  const onEntryPointerDown = vi.fn();
  render(
    <InitiativeStrip
      entries={[
        ...entries,
        { key: 'd', order: 4, active: false, name: 'Wolf', onBoard: false, hiddenFromPlayers: true, placeable: true },
      ]}
      controls
      onEntryClick={onEntryClick}
      onEntryPointerDown={onEntryPointerDown}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Goblin Boss' }));
  expect(onEntryClick).toHaveBeenCalledWith(expect.objectContaining({ key: 'b' }));

  fireEvent.pointerDown(screen.getByRole('button', { name: 'Goblin A' }));
  expect(onEntryPointerDown).not.toHaveBeenCalled();
  fireEvent.pointerDown(screen.getByRole('button', { name: 'Wolf' }));
  expect(onEntryPointerDown).toHaveBeenCalledWith(expect.objectContaining({ key: 'd' }), expect.anything());
  expect(screen.getByRole('button', { name: 'Wolf' }).closest('li')).toHaveAttribute('title', expect.stringMatching(/drag it onto the map/));
});
