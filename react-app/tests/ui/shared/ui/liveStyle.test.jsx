import { render } from '@testing-library/react';
import { useLiveStyle } from '../../../../src/shared/ui/liveStyle.js';

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
