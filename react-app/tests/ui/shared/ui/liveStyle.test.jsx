import { render, renderHook } from '@testing-library/react';
import { useLiveStyle, useRootStyle, writeLiveStyle } from '../../../../src/shared/ui/liveStyle.js';

function Mover({ x, size }) {
  const ref = useLiveStyle({ transform: `translate(${x}px, 0px)`, width: size, height: null });
  return <div ref={ref} data-testid="mover" />;
}

// A value that changes every frame lands on the element itself (numbers as
// pixels, null clearing), so moving it inserts no new CSS rule.
test('useLiveStyle writes the moving values onto the element', () => {
  const { getByTestId, rerender } = render(<Mover x={10} size={24} />);
  const node = getByTestId('mover');
  expect(node.style.transform).toBe('translate(10px, 0px)');
  expect(node.style.width).toBe('24px');
  const rulesBefore = [...document.styleSheets].reduce((n, sheet) => n + sheet.cssRules.length, 0);
  rerender(<Mover x={40} size={24} />);
  expect(node.style.transform).toBe('translate(40px, 0px)');
  expect(node.style.height).toBe('');
  expect([...document.styleSheets].reduce((n, sheet) => n + sheet.cssRules.length, 0)).toBe(rulesBefore);
});

// One writer for every imperative write: unitless numbers stay bare, custom
// properties are set and cleared, a missing node is no error.
test('writeLiveStyle keeps unitless numbers bare and handles custom properties', () => {
  const node = document.createElement('div');
  writeLiveStyle(node, { opacity: 0.5, left: 12, '--gap': 4, '--name': 'auto' });
  expect(node.style.opacity).toBe('0.5');
  expect(node.style.left).toBe('12px');
  expect(node.style.getPropertyValue('--gap')).toBe('4px');
  expect(node.style.getPropertyValue('--name')).toBe('auto');
  writeLiveStyle(node, { '--gap': null, left: null });
  expect(node.style.getPropertyValue('--gap')).toBe('');
  expect(node.style.left).toBe('');
  expect(() => writeLiveStyle(null, { left: 1 })).not.toThrow();
});

// A page-wide setting holds while its component is mounted, and what was there
// before comes back after; `enabled: false` leaves the page alone.
test('useRootStyle sets the page root while mounted and puts it back', () => {
  const root = document.documentElement;
  root.style.overscrollBehaviorY = 'contain';
  const { unmount } = renderHook(() => useRootStyle({ overscrollBehaviorY: 'none' }));
  expect(root.style.overscrollBehaviorY).toBe('none');
  unmount();
  expect(root.style.overscrollBehaviorY).toBe('contain');
  renderHook(() => useRootStyle({ overscrollBehaviorY: 'none' }, { enabled: false }));
  expect(root.style.overscrollBehaviorY).toBe('contain');
  root.style.overscrollBehaviorY = '';
});
