import { act, fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import ColorField from '../../../../src/shared/ui/ColorField.jsx';

test('a deferred color field stays native while dragging and emits only after the pause', () => {
  vi.useFakeTimers();
  const onChange = vi.fn();
  const { rerender } = render(
    <ColorField value="#111111" label="Ink colour" deferMs={180} onChange={onChange} />,
  );
  const input = screen.getByLabelText('Ink colour');

  fireEvent.pointerDown(input);
  fireEvent.input(input, { target: { value: '#3366ff' } });
  rerender(<ColorField value="#111111" label="Ink colour" deferMs={180} onChange={onChange} />);

  expect(input).toHaveValue('#3366ff');
  expect(onChange).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(180));
  expect(onChange).toHaveBeenCalledOnce();
  expect(onChange).toHaveBeenCalledWith('#3366ff');

  vi.useRealTimers();
});

test('a commit-on-blur color field emits once, when the picker closes', () => {
  const onChange = vi.fn();
  render(<ColorField value="#111111" label="Object color" commitOnBlur disabled={false} title="Object color" onChange={onChange} />);
  const input = screen.getByLabelText('Object color');

  fireEvent.pointerDown(input);
  fireEvent.input(input, { target: { value: '#3366ff' } });
  fireEvent.input(input, { target: { value: '#ff3355' } });
  expect(onChange).not.toHaveBeenCalled();

  fireEvent.blur(input);
  expect(onChange).toHaveBeenCalledOnce();
  expect(onChange).toHaveBeenCalledWith('#ff3355');
  expect(input).toHaveAttribute('title', 'Object color');
});
