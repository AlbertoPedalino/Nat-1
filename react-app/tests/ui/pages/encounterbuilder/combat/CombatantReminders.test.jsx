import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CombatantReminders from '../../../../../src/pages/encounterbuilder/combat/CombatantReminders.jsx';
import { MAX_EFFECTS } from '../../../../../src/shared/character/combat/combatEffects.js';

// The real provider drags in the monster DB, persistence and supabase realtime.
// The component only ever needs `dispatch`, so that is all this stands in for.
const dispatch = vi.fn();
vi.mock('../../../../../src/pages/encounterbuilder/state/EncounterBuilderContext.jsx', () => ({
  useEncounterBuilder: () => ({ dispatch }),
}));

function renderReminders(activeEffects = []) {
  dispatch.mockClear();
  render(<CombatantReminders combatant={{ id: 7, activeEffects }} />);
}

const reminder = (text) => ({ key: 'custom', text });
const openPanel = () => userEvent.click(screen.getByRole('button', { name: /^Reminders/ }));

describe('CombatantReminders', () => {
  test('reminders are chips on the collapsed row, by name', () => {
    renderReminders([reminder('Bardic Inspiration'), reminder('Guidance')]);

    expect(screen.getByText('Bardic Inspiration')).toBeInTheDocument();
    expect(screen.getByText('Guidance')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Reminders \(2\)/ })).toBeInTheDocument();
  });

  test('removing a chip targets that reminder and not the whole list', async () => {
    renderReminders([reminder('Bardic Inspiration'), reminder('Guidance')]);

    await userEvent.click(screen.getByLabelText('Remove Guidance'));
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({ type: 'removeCombatantEffect', id: 7, effectId: 'Guidance' });
  });

  test('a reminder is added on Enter and never while blank', async () => {
    renderReminders();
    await openPanel();
    const field = screen.getByLabelText('Reminder');

    await userEvent.type(field, '   {Enter}');
    expect(dispatch).not.toHaveBeenCalled();

    await userEvent.clear(field);
    await userEvent.type(field, 'bleeding 1d4{Enter}');
    expect(dispatch).toHaveBeenCalledWith({ type: 'addCombatantEffect', id: 7, payload: { text: 'bleeding 1d4' } });
    expect(field).toHaveValue('');
  });

  // The advantage/disadvantage grid is gone: those are chosen on the roll.
  test('the panel offers no advantage or disadvantage', async () => {
    renderReminders();
    await openPanel();

    expect(screen.queryByText('ADV')).toBeNull();
    expect(screen.queryByText('DIS')).toBeNull();
    expect(screen.queryByRole('button', { name: /advantage/i })).toBeNull();
  });

  // A cap that silently swallows an entry reads as a broken field. At the limit
  // it has to say why it stopped, while removal keeps working.
  test('at the limit the field is disabled but removal still works', async () => {
    renderReminders(Array.from({ length: MAX_EFFECTS }, (_, i) => reminder(`e${i}`)));
    await openPanel();

    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
    expect(screen.getByLabelText('Reminder')).toBeDisabled();
    await userEvent.click(screen.getByLabelText('Remove e3'));
    expect(dispatch).toHaveBeenCalledWith({ type: 'removeCombatantEffect', id: 7, effectId: 'e3' });
  });

  test('Clear only appears once there is something to clear', async () => {
    renderReminders();
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();

    renderReminders([reminder('Bless')]);
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'clearCombatantEffects', id: 7 });
  });
});
