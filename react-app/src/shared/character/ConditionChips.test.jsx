import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConditionCard, ConditionPill } from './ConditionChips.jsx';

describe('ConditionPill', () => {
  // The pill carries two actions in one chip. If they ever collapse into one,
  // a GM trying to read what Prone does would delete it instead.
  test('expanding and removing are separate actions', async () => {
    const onToggle = vi.fn();
    const onRemove = vi.fn();
    render(<ConditionPill label="Prone" hasDesc isOpen={false} onToggle={onToggle} onRemove={onRemove} />);

    await userEvent.click(screen.getByText('Prone'));
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onRemove).not.toHaveBeenCalled();

    await userEvent.click(document.querySelector('.MuiChip-deleteIcon'));
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  test('a condition with no rules text is not clickable', async () => {
    const onToggle = vi.fn();
    render(<ConditionPill label="Prone" hasDesc={false} isOpen={false} onToggle={onToggle} />);

    await userEvent.click(screen.getByText('Prone'));
    expect(onToggle).not.toHaveBeenCalled();
  });

  // Exhaustion in the encounter: visible, explained, but not removable there.
  test('a read-only pill offers no delete control and explains why', () => {
    render(<ConditionPill label="Exhaustion" hasDesc readOnlyReason="Set it on the character sheet" />);

    expect(screen.getByText('Exhaustion')).toBeInTheDocument();
    expect(document.querySelector('.MuiChip-deleteIcon')).toBeNull();
  });
});

describe('ConditionCard', () => {
  test('renders the rules text and closes', async () => {
    const onClose = vi.fn();
    render(
      <ConditionCard
        label="Restrained"
        entries={['Your Speed becomes 0.', 'Attack rolls against you have Advantage.']}
        onClose={onClose}
      />,
    );

    expect(screen.getByText('Restrained')).toBeInTheDocument();
    expect(screen.getByText(/Your Speed becomes 0/)).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('Close Restrained'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
