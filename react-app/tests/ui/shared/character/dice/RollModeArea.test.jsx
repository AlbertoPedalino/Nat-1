import { act, fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import RollModeArea from '../../../../../src/shared/character/dice/RollModeArea.jsx';

// Right-click or long press on a roller: + Advantage / + Disadvantage for this
// one roll, added to the sources the roll already has.

function renderArea(sources = { adv: false, disadv: true }) {
  const onClick = vi.fn();
  const onPick = vi.fn();
  render(<RollModeArea sources={sources} onClick={onClick} onPick={onPick}>Hit +5</RollModeArea>);
  return { onClick, onPick, roller: screen.getByText('Hit +5') };
}

test('a plain click rolls as before and opens nothing', () => {
  const { onClick, onPick, roller } = renderArea();
  fireEvent.click(roller);
  expect(onClick).toHaveBeenCalledTimes(1);
  expect(onPick).not.toHaveBeenCalled();
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
});

test('right-click offers an extra source and shows what the roll becomes', () => {
  const { onClick, onPick, roller } = renderArea({ adv: false, disadv: true });
  fireEvent.contextMenu(roller, { clientX: 10, clientY: 10 });
  const advantage = screen.getByRole('menuitem', { name: /\+ Advantage/ });
  expect(advantage).toHaveTextContent('→ Straight roll');
  expect(screen.getByRole('menuitem', { name: /\+ Disadvantage/ })).toHaveTextContent('→ Disadvantage');
  fireEvent.click(advantage);
  expect(onPick).toHaveBeenCalledWith(undefined);
  expect(onClick).not.toHaveBeenCalled();
});

test('a long press opens the menu and the click that ends it does not roll', () => {
  vi.useFakeTimers();
  try {
    const { onClick, onPick, roller } = renderArea({ adv: false, disadv: false });
    fireEvent.touchStart(roller, { touches: [{ clientX: 5, clientY: 5 }] });
    act(() => { vi.advanceTimersByTime(500); });
    fireEvent.touchEnd(roller);
    fireEvent.click(roller);
    expect(onClick).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('menuitem', { name: /\+ Advantage/ }));
    expect(onPick).toHaveBeenCalledWith(true);
  } finally {
    vi.useRealTimers();
  }
});

test('a press that moves is a scroll, not a long press', () => {
  vi.useFakeTimers();
  try {
    const { roller } = renderArea();
    fireEvent.touchStart(roller, { touches: [{ clientX: 5, clientY: 5 }] });
    fireEvent.touchMove(roller, { touches: [{ clientX: 5, clientY: 40 }] });
    act(() => { vi.advanceTimersByTime(600); });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  } finally {
    vi.useRealTimers();
  }
});
