import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, expect, test } from 'vitest';
import { ReminderEditor } from '../../../../../src/shared/character/combat/ReminderChips.jsx';
import { addReminder, removeEffect } from '../../../../../src/shared/character/combat/combatEffects.js';
import { REMINDER_HISTORY_KEY } from '../../../../../src/shared/character/combat/reminderHistory.js';

beforeEach(() => localStorage.clear());

function Editor({ initial = [] }) {
  const [effects, setEffects] = useState(initial);
  return (
    <ReminderEditor
      effects={effects}
      onAdd={(text) => setEffects((list) => addReminder(list, text))}
      onRemove={(id) => setEffects((list) => removeEffect(list, id))}
    />
  );
}

function type(text) {
  const field = screen.getByLabelText('Reminder');
  fireEvent.change(field, { target: { value: text } });
  fireEvent.keyDown(field, { key: 'Enter' });
}

const recent = () => screen.queryByRole('group', { name: 'Recent reminders' });

// The point of the history: a reminder taken off can be put back in one tap.
test('a removed reminder is offered again and comes back with one tap', () => {
  render(<Editor />);
  type('Bardic Inspiration');
  expect(recent()).toBeNull();

  fireEvent.click(screen.getByLabelText('Remove Bardic Inspiration'));
  fireEvent.click(within(recent()).getByText('Bardic Inspiration'));

  expect(screen.getByLabelText('Remove Bardic Inspiration')).toBeInTheDocument();
  expect(recent()).toBeNull();
});

test('the history is kept in this browser and survives a remount', () => {
  const { unmount } = render(<Editor />);
  type('Guidance');
  unmount();
  expect(JSON.parse(localStorage.getItem(REMINDER_HISTORY_KEY))).toEqual(['Guidance']);

  render(<Editor />);
  expect(within(recent()).getByText('Guidance')).toBeInTheDocument();
});

test('typing narrows the recent reminders', () => {
  localStorage.setItem(REMINDER_HISTORY_KEY, JSON.stringify(['Bless', 'Guidance']));
  render(<Editor />);
  fireEvent.change(screen.getByLabelText('Reminder'), { target: { value: 'gui' } });
  expect(within(recent()).queryByText('Bless')).toBeNull();
  expect(within(recent()).getByText('Guidance')).toBeInTheDocument();
});

test('a recent reminder can be forgotten', () => {
  localStorage.setItem(REMINDER_HISTORY_KEY, JSON.stringify(['Blss', 'Bless']));
  render(<Editor />);
  fireEvent.click(screen.getByLabelText('Forget Blss'));
  expect(within(recent()).queryByText('Blss')).toBeNull();
  expect(JSON.parse(localStorage.getItem(REMINDER_HISTORY_KEY))).toEqual(['Bless']);
});

test('a broken stored history is ignored', () => {
  localStorage.setItem(REMINDER_HISTORY_KEY, '{not json');
  render(<Editor />);
  expect(recent()).toBeNull();
  type('Bless');
  expect(JSON.parse(localStorage.getItem(REMINDER_HISTORY_KEY))).toEqual(['Bless']);
});

test('a read-only list offers no recent reminders', () => {
  localStorage.setItem(REMINDER_HISTORY_KEY, JSON.stringify(['Bless']));
  render(<ReminderEditor effects={[]} disabled onAdd={() => {}} onRemove={() => {}} />);
  expect(recent()).toBeNull();
});
