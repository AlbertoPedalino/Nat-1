import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MarkerRow from './MarkerRow.jsx';

// The frame the conditions row and the effects row both render through. They sit
// one above the other on the same card, so these are the rules that keep them
// reading as two kinds of the same thing.
describe('MarkerRow', () => {
  test('the disclosure label carries the count and hides the panel until opened', async () => {
    render(<MarkerRow label="Effects" count={2}><div>panel</div></MarkerRow>);

    expect(screen.queryByText('panel')).toBeNull();
    const toggle = screen.getByRole('button', { name: /^Effects \(2\)/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(toggle);
    expect(screen.getByText('panel')).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  test('a count of zero leaves the label bare rather than showing (0)', () => {
    render(<MarkerRow label="Conditions" count={0}><div /></MarkerRow>);
    expect(screen.getByRole('button', { name: /^Conditions$/ })).toBeInTheDocument();
  });

  // Clear needs both a handler and something to clear. The conditions row passes
  // a handler with a count that excludes exhaustion, precisely so a combatant
  // whose only marker is exhaustion gets no Clear it cannot honour.
  test('Clear appears only with a handler and a non-zero count', async () => {
    const onClear = vi.fn();
    const { unmount } = render(<MarkerRow label="X" count={0} onClear={onClear}><div /></MarkerRow>);
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
    unmount();

    render(<MarkerRow label="X" count={1}><div /></MarkerRow>);
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();

    render(<MarkerRow label="X" count={1} onClear={onClear}><div /></MarkerRow>);
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  // Pills are the whole point of the row: they are what a GM scans down the
  // initiative list, so they can never end up behind the disclosure.
  test('pills and belowRow stay visible while the panel is closed', () => {
    render(
      <MarkerRow label="X" count={1} pills={<span>pill</span>} belowRow={<span>card</span>}>
        <div>panel</div>
      </MarkerRow>,
    );

    expect(screen.getByText('pill')).toBeInTheDocument();
    expect(screen.getByText('card')).toBeInTheDocument();
    expect(screen.queryByText('panel')).toBeNull();
  });
});
