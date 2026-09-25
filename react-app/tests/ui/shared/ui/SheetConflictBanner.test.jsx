import { fireEvent, render, screen } from '@testing-library/react';
import SheetConflictBanner from '../../../../src/shared/ui/SheetConflictBanner.jsx';

test('names what was updated and offers exactly the two choices', () => {
  const onLoadRemote = vi.fn();
  const onKeepLocal = vi.fn();
  render(<SheetConflictBanner subject="character" onLoadRemote={onLoadRemote} onKeepLocal={onKeepLocal} />);
  expect(screen.getByText(/This character was updated elsewhere/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Load updated version' }));
  fireEvent.click(screen.getByRole('button', { name: 'Keep my changes' }));
  expect(onLoadRemote).toHaveBeenCalledOnce();
  expect(onKeepLocal).toHaveBeenCalledOnce();
});
