import { act, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import DiceToast from '../../../../../src/shared/character/dice/DiceToast.jsx';

test('a result hidden by the background still expires', () => {
  vi.useFakeTimers();
  const onClose = vi.fn();
  const toast = { id: 'roll', label: 'Perception roll', total: 14, rolls: [] };
  const { rerender, unmount } = render(<DiceToast toast={toast} onClose={onClose} />);
  try {
    expect(screen.getByText('Perception roll')).toBeInTheDocument();
    rerender(<DiceToast toast={toast} onClose={onClose} hidden />);
    expect(screen.queryByText('Perception roll')).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(6000));
    expect(onClose).toHaveBeenCalledOnce();
  } finally {
    unmount();
    vi.useRealTimers();
  }
});
