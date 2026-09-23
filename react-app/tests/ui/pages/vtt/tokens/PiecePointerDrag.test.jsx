import { fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import {
  beginPiecePointerDrag, PIECE_TOUCH_HOLD_MS,
} from '../../../../../src/pages/vtt/tokens/PiecePreview.jsx';

let source;
let outside;

beforeEach(() => {
  vi.useFakeTimers();
  source = document.createElement('div');
  outside = document.createElement('p');
  outside.textContent = 'Text outside the pieces panel';
  document.body.append(source, outside);
});

afterEach(() => {
  fireEvent(window, new Event('blur'));
  source.remove();
  outside.remove();
  window.getSelection()?.removeAllRanges();
  vi.useRealTimers();
});

function begin(target = source, callbacks = {}) {
  beginPiecePointerDrag({
    pointerType: 'touch', pointerId: 7, isPrimary: true,
    clientX: 20, clientY: 20, target, currentTarget: source,
  }, { kind: 'token', token: { label: 'Goblin' } }, callbacks);
}

function end(type, pointerId = 7) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, { pointerId, clientX: 60, clientY: 60 });
  fireEvent(window, event);
}

function prevented(type) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  fireEvent(outside, event);
  return event.defaultPrevented;
}

test('a touch hold blocks page selection and the native menu, then restores them after dropping', () => {
  const range = document.createRange();
  range.selectNodeContents(outside);
  window.getSelection().addRange(range);
  begin();

  expect(prevented('selectstart')).toBe(true);
  expect(prevented('contextmenu')).toBe(true);
  expect(getComputedStyle(outside).userSelect).toBe('none');
  expect(prevented('touchmove')).toBe(false);

  vi.advanceTimersByTime(PIECE_TOUCH_HOLD_MS);
  expect(window.getSelection().rangeCount).toBe(0);
  expect(prevented('selectstart')).toBe(true);
  expect(prevented('touchmove')).toBe(true);

  end('pointerup');
  expect(prevented('selectstart')).toBe(false);
  expect(prevented('contextmenu')).toBe(false);
  expect(getComputedStyle(outside).userSelect).not.toBe('none');
});

test.each(['pointerup', 'pointermove', 'pointercancel', 'blur'])(
  '%s before the hold restores selection and cancels pending placement', (type) => {
    const onPlacementDragStart = vi.fn();
    begin(source, { onPlacementDragStart });
    end(type);
    vi.advanceTimersByTime(PIECE_TOUCH_HOLD_MS);

    expect(onPlacementDragStart).not.toHaveBeenCalled();
    expect(prevented('selectstart')).toBe(false);
    expect(prevented('contextmenu')).toBe(false);
    expect(prevented('touchmove')).toBe(false);
    expect(getComputedStyle(outside).userSelect).not.toBe('none');
  },
);

test.each(['pointercancel', 'blur'])('%s during dragging releases the selection guard', (type) => {
  const onPlacementDragEnd = vi.fn();
  begin(source, { onPlacementDragEnd });
  vi.advanceTimersByTime(PIECE_TOUCH_HOLD_MS);
  end(type);

  expect(onPlacementDragEnd).toHaveBeenCalledOnce();
  expect(prevented('selectstart')).toBe(false);
  expect(prevented('contextmenu')).toBe(false);
  expect(prevented('touchmove')).toBe(false);
  expect(getComputedStyle(outside).userSelect).not.toBe('none');
});

test('nested editing controls keep native selection and do not start placement', () => {
  const input = document.createElement('input');
  source.appendChild(input);
  const onPlacementDragStart = vi.fn();
  begin(input, { onPlacementDragStart });
  vi.advanceTimersByTime(PIECE_TOUCH_HOLD_MS);

  expect(onPlacementDragStart).not.toHaveBeenCalled();
  expect(prevented('selectstart')).toBe(false);
  expect(getComputedStyle(outside).userSelect).not.toBe('none');
});
