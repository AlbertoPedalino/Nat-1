import { useEffect, useRef } from 'react';
import { Box } from '@mui/material';

// A native colour well that does not fight the picker it opens.
//
// A plain controlled `<input type="color">` jumps while you drag inside the
// picker: every move fires a change, React re-renders, and writing the value
// back into the input snaps the widget away from the pointer. So the input
// holds its own value while it is being used, and takes one from outside again
// only once it is done — which is also the only time an outside change can mean
// anything.
export default function ColorField({ value, onChange, label, sx, deferMs = 0 }) {
  const inputRef = useRef(null);
  const editing = useRef(false);
  const changeTimerRef = useRef(null);

  useEffect(() => {
    if (!editing.current && inputRef.current) inputRef.current.value = value || '#000000';
  }, [value]);

  const emitChange = (next) => {
    if (!deferMs) {
      onChange?.(next);
      return;
    }
    clearTimeout(changeTimerRef.current);
    changeTimerRef.current = setTimeout(() => onChange?.(next), deferMs);
  };

  return (
    <Box
      ref={inputRef}
      component="input"
      type="color"
      defaultValue={value || '#000000'}
      aria-label={label}
      onPointerDown={() => { editing.current = true; }}
      onInput={(event) => emitChange(event.currentTarget.value)}
      // The picker is a window of its own: it is done with when focus comes
      // back, not when the pointer goes up somewhere over the page.
      onBlur={() => { editing.current = false; }}
      sx={sx}
    />
  );
}
