import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RollsButton from '../../../../../src/pages/vtt/rolls/RollsButton.jsx';

const feed = [{
  id: 'roll-1',
  actorName: 'Arannis',
  label: 'Attack',
  detail: '1d20 [17] + 5',
  total: 22,
  rolls: [{ v: 17, faces: 20, kept: true }],
  bonus: 5,
}];

describe('RollsButton', () => {
  it('rolls first and keeps the log as the second half', () => {
    render(<RollsButton feed={feed} onCustomRoll={vi.fn()} onClear={vi.fn()} />);
    const [roll, log] = screen.getAllByRole('button');
    expect(roll).toHaveAccessibleName('Roll dice');
    expect(log).toHaveAccessibleName('Roll log, 1 roll');
    // A visible rule between the halves, so the pill does not read as one button.
    expect(log).toHaveStyle({ borderLeftWidth: '1px', borderLeftStyle: 'solid' });
    expect(roll).not.toHaveStyle({ borderLeftStyle: 'solid' });
  });

  it('opens the dice picker straight from the dice half', () => {
    render(<RollsButton feed={feed} onCustomRoll={vi.fn()} onClear={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Roll dice' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByText('Attack')).not.toBeInTheDocument();
  });

  it('opens the roll log from the log half', () => {
    const onClear = vi.fn();
    render(<RollsButton feed={feed} onCustomRoll={vi.fn()} onClear={onClear} />);
    expect(screen.queryByText('Attack')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Roll log, 1 roll' }));
    expect(screen.getByText('Attack')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onClear).toHaveBeenCalledOnce();
  });
});
