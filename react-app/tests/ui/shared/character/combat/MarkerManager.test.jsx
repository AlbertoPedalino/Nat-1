import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MarkerManager, { MarkerClearAction } from '../../../../../src/shared/character/combat/MarkerManager.jsx';

// The one frame for a creature's markers: the sheet's Conditions and
// Reminders panels and an encounter combatant's two marker lines. These are
// the rules that keep them reading as two kinds of the same thing.
describe('MarkerManager', () => {
  // The markers are on show beside it, so the toggle names its kind and no count.
  test('the toggle is named by its kind alone and hides the surface until opened', async () => {
    render(<MarkerManager label="Reminders" count={2}><div>panel</div></MarkerManager>);

    expect(screen.queryByText('panel')).toBeNull();
    const toggle = screen.getByRole('button', { name: /^Reminders$/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(toggle);
    expect(screen.getByText('panel')).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  test('with nothing on, the label is the same bare one', () => {
    render(<MarkerManager label="Conditions" count={0}><div /></MarkerManager>);
    expect(screen.getByRole('button', { name: /Conditions$/ })).toBeInTheDocument();
  });

  test('in a panel the toggle is "Manage" and an empty one says None', () => {
    render(<MarkerManager count={0}><div /></MarkerManager>);
    expect(screen.getByText('— None')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Manage$/ })).toBeInTheDocument();
  });

  test('a small surface stays open with collapse off', () => {
    render(<MarkerManager count={0} collapse={false}><div>field</div></MarkerManager>);
    expect(screen.getByText('field')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  // On a combatant's line the clear sits at its end; it needs both a handler
  // and something to clear. The conditions line passes a count that leaves out
  // exhaustion, so a combatant whose only marker is exhaustion gets no clear it
  // cannot honour.
  test('an inline line clears only with a handler and a non-zero count', async () => {
    const onClear = vi.fn();
    const { unmount } = render(<MarkerManager inline label="Conditions" count={0} onClear={onClear}><div /></MarkerManager>);
    expect(screen.queryByRole('button', { name: 'Clear all conditions' })).toBeNull();
    expect(screen.queryByText('— None')).toBeNull();
    unmount();

    render(<MarkerManager inline label="Conditions" count={1} onClear={onClear}><div /></MarkerManager>);
    await userEvent.click(screen.getByRole('button', { name: 'Clear all conditions' }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  // The markers are what a GM scans down the initiative list and what a player
  // reads on the sheet: they never end up behind the toggle.
  test('pills and what opens below them stay visible while the surface is closed', () => {
    render(
      <MarkerManager inline label="X" count={1} pills={[<span key="p">pill</span>]} below={<span>card</span>}>
        <div>panel</div>
      </MarkerManager>,
    );

    expect(screen.getByText('pill')).toBeInTheDocument();
    expect(screen.getByText('card')).toBeInTheDocument();
    expect(screen.queryByText('panel')).toBeNull();
  });

  test('a panel header clear shows only while there is something to clear', async () => {
    const onClear = vi.fn();
    const { rerender } = render(<MarkerClearAction count={0} onClear={onClear} what="reminders" />);
    expect(screen.queryByRole('button')).toBeNull();
    rerender(<MarkerClearAction count={2} onClear={onClear} what="reminders" />);
    await userEvent.click(screen.getByRole('button', { name: 'Clear all reminders' }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
