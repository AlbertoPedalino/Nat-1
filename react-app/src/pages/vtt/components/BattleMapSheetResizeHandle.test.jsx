import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BattleMapSheetResizeHandle from './BattleMapSheetResizeHandle.jsx';

describe('BattleMapSheetResizeHandle', () => {
  it('resizes with the keyboard and resets with Home', () => {
    const onCommit = vi.fn();
    render(
      <BattleMapSheetResizeHandle
        containerRef={{ current: null }}
        value={60}
        onCommit={onCommit}
      />,
    );
    const separator = screen.getByRole('separator');

    fireEvent.keyDown(separator, { key: 'ArrowRight' });
    expect(onCommit).toHaveBeenLastCalledWith(62);
    fireEvent.keyDown(separator, { key: 'Home' });
    expect(onCommit).toHaveBeenLastCalledWith(60);
  });

  it('converts a pointer drag into a saved split', () => {
    const onCommit = vi.fn();
    const style = { setProperty: vi.fn() };
    const containerRef = {
      current: { getBoundingClientRect: () => ({ left: 100, width: 1000 }), style },
    };
    render(
      <BattleMapSheetResizeHandle
        containerRef={containerRef}
        value={60}
        onCommit={onCommit}
      />,
    );
    const separator = screen.getByRole('separator');

    const dispatchPointer = (type, clientX) => {
      const event = new Event(type, { bubbles: true });
      Object.defineProperties(event, {
        pointerId: { value: 1 },
        clientX: { value: clientX },
      });
      fireEvent(separator, event);
    };

    dispatchPointer('pointerdown', 700);
    dispatchPointer('pointermove', 650);
    dispatchPointer('pointerup', 650);
    expect(onCommit).toHaveBeenCalledWith(55);
    expect(style.setProperty).toHaveBeenLastCalledWith(
      '--sheet-grid-columns',
      'minmax(0, 55fr) 12px minmax(360px, 45fr)',
    );
  });
});
