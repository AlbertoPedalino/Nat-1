import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CombatantEffects from './CombatantEffects.jsx';
import { MAX_EFFECTS } from '../../../shared/character/combatEffects.js';

// The real provider drags in the monster DB, persistence and supabase realtime.
// The component only ever needs `dispatch`, so that is all this stands in for.
const dispatch = vi.fn();
vi.mock('../state/EncounterBuilderContext.jsx', () => ({
  useEncounterBuilder: () => ({ dispatch }),
}));

function renderEffects(activeEffects = []) {
  dispatch.mockClear();
  render(<CombatantEffects combatant={{ id: 7, activeEffects }} />);
}

const openPanel = () => userEvent.click(screen.getByRole('button', { name: /^Effects/ }));

describe('CombatantEffects', () => {
  test('active effects are pills on the collapsed row, tagged and dated', async () => {
    renderEffects([
      { key: 'selfAttackDisadv', duration: 'next' },
      { key: 'incomingAttackAdv', duration: 'manual' },
    ]);

    expect(screen.getByText('DIS Attacks · next')).toBeInTheDocument();
    // 'manual' means "until removed", which an unqualified marker already says.
    expect(screen.getByText('ADV Attacks vs')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Effects \(2\)/ })).toBeInTheDocument();
  });

  test('assigning an effect from the grid does not ask for a duration first', async () => {
    renderEffects();
    await openPanel();
    await userEvent.click(screen.getByRole('button', { name: /^Disadvantage on saving throws \(this creature\)/i }));

    expect(dispatch).toHaveBeenCalledWith({ type: 'toggleCombatantEffect', id: 7, key: 'selfSaveDisadv' });
  });

  // Duration belongs to the effect, not to the panel: each pill opens its own
  // menu, so a combatant can hold two effects on different timings.
  test('each pill re-times only its own effect', async () => {
    renderEffects([
      { key: 'selfAttackDisadv', duration: 'next' },
      { key: 'selfSaveDisadv', duration: 'next' },
    ]);

    await userEvent.click(screen.getByText('DIS Saves · next'));
    await userEvent.click(screen.getByRole('menuitemradio', { name: /Until removed/ }));

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({
      type: 'setCombatantEffectDuration', id: 7, effectId: 'selfSaveDisadv|next|', duration: 'manual',
    });
  });

  test('the duration menu marks the effect\'s current timing', async () => {
    renderEffects([{ key: 'selfAttackDisadv', duration: 'round' }]);

    await userEvent.click(screen.getByText('DIS Attacks · round'));
    expect(screen.getByRole('menuitemradio', { name: /Until the end of this round/ }))
      .toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('menuitemradio', { name: /Next roll of that kind/ }))
      .toHaveAttribute('aria-checked', 'false');
  });

  test('an active effect shows its grid button as pressed', async () => {
    renderEffects([{ key: 'incomingAttackAdv', duration: 'next' }]);
    await openPanel();

    const button = screen.getByRole('button', { name: /^Advantage on attack rolls \(rolls against it\)/i });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^Disadvantage on attack rolls \(rolls against it\)/i }))
      .toHaveAttribute('aria-pressed', 'false');
  });

  test('removing a pill targets that effect and not the whole list', async () => {
    renderEffects([
      { key: 'selfAttackDisadv', duration: 'next' },
      { key: 'selfSaveDisadv', duration: 'turn' },
    ]);

    await userEvent.click(document.querySelectorAll('.MuiChip-deleteIcon')[1]);
    expect(dispatch).toHaveBeenCalledWith({
      type: 'removeCombatantEffect', id: 7, effectId: 'selfSaveDisadv|turn|',
    });
  });

  test('a custom effect is added on Enter and never while blank', async () => {
    renderEffects();
    await openPanel();
    const field = screen.getByLabelText('Custom effect');

    await userEvent.type(field, '   {Enter}');
    expect(dispatch).not.toHaveBeenCalled();

    await userEvent.clear(field);
    await userEvent.type(field, 'bleeding 1d4{Enter}');
    expect(dispatch).toHaveBeenCalledWith({
      type: 'addCombatantEffect',
      id: 7,
      payload: { text: 'bleeding 1d4', polarity: 'note' },
    });
  });

  // A cap that silently swallows a click reads as a broken button. At the limit
  // the controls that could only add have to say why they stopped.
  test('at the effect limit the add controls are disabled but removal still works', async () => {
    const full = Array.from({ length: MAX_EFFECTS }, (_, i) => ({ key: 'custom', text: `e${i}`, duration: 'manual', polarity: 'note' }));
    renderEffects([...full.slice(1), { key: 'selfAttackDisadv', duration: 'next' }]);
    await openPanel();

    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
    expect(screen.getByLabelText('Custom effect')).toBeDisabled();
    // Unpressed: adding is what is blocked.
    expect(screen.getByRole('button', { name: /^Advantage on attack rolls \(this creature\)/i })).toBeDisabled();
    // Already active, so clicking it removes — that must stay available.
    expect(screen.getByRole('button', { name: /^Disadvantage on attack rolls \(this creature\)/i })).toBeEnabled();
  });

  test('Clear only appears once there is something to clear', async () => {
    renderEffects();
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();

    renderEffects([{ key: 'selfCheckAdv', duration: 'round' }]);
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'clearCombatantEffects', id: 7 });
  });
});
