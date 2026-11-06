import { useRef } from 'react';
import { fireEvent, render, renderHook } from '@testing-library/react';
import { useEventListener } from '../../../../src/shared/ui/useEventListener.js';

test('calls the latest handler without re-attaching, and detaches on unmount', () => {
  const add = vi.spyOn(window, 'addEventListener');
  const first = vi.fn();
  const second = vi.fn();
  const { rerender, unmount } = renderHook(
    ({ handler }) => useEventListener(window, 'gb:test-event', handler),
    { initialProps: { handler: first } },
  );
  rerender({ handler: second });
  window.dispatchEvent(new Event('gb:test-event'));
  expect(first).not.toHaveBeenCalled();
  expect(second).toHaveBeenCalledOnce();
  expect(add.mock.calls.filter(([type]) => type === 'gb:test-event')).toHaveLength(1);
  add.mockRestore();

  unmount();
  window.dispatchEvent(new Event('gb:test-event'));
  expect(second).toHaveBeenCalledOnce();
});

test('enabled switches the listener on and off', () => {
  const handler = vi.fn();
  const { rerender } = renderHook(
    ({ enabled }) => useEventListener(document, 'keydown', handler, { enabled }),
    { initialProps: { enabled: false } },
  );
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(handler).not.toHaveBeenCalled();
  rerender({ enabled: true });
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(handler).toHaveBeenCalledOnce();
  rerender({ enabled: false });
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(handler).toHaveBeenCalledOnce();
});

test('reads a ref when attaching, and passes the options through', () => {
  const handler = vi.fn();
  let node = null;
  function Host() {
    const ref = useRef(null);
    useEventListener(ref, 'wheel', handler, { passive: false, capture: true });
    return <div ref={(el) => { ref.current = el; if (el) node = el; }} />;
  }
  const add = vi.spyOn(HTMLElement.prototype, 'addEventListener');
  const remove = vi.spyOn(HTMLElement.prototype, 'removeEventListener');
  const { unmount } = render(<Host />);
  const onNode = (spy) => spy.mock.calls.filter((_, index) => spy.mock.contexts[index] === node);
  const [added] = onNode(add);
  expect(added[0]).toBe('wheel');
  expect(added[2]).toEqual({ passive: false, capture: true });
  fireEvent.wheel(node);
  expect(handler).toHaveBeenCalledOnce();
  unmount();
  const [removed] = onNode(remove);
  expect(removed[0]).toBe('wheel');
  expect(removed[1]).toBe(added[1]);
  expect(removed[2]).toEqual({ capture: true });
  add.mockRestore();
  remove.mockRestore();
});

test('a missing target or an empty ref is a no-op', () => {
  expect(() => renderHook(() => useEventListener(null, 'click', () => {}))).not.toThrow();
  expect(() => renderHook(() => useEventListener({ current: null }, 'click', () => {}))).not.toThrow();
});
