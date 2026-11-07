import { useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import { useDebouncedCallback } from './useDebouncedCallback.js';

// A native colour well that does not fight the picker it opens.
//
// A plain controlled `<input type="color">` jumps while you drag inside the
// picker: every move fires a change, React re-renders, and writing the value
// back into the input snaps the widget away from the pointer. So the input
// holds its own value while it is being used, and takes one from outside again
// only once it is done — which is also the only time an outside change can mean
// anything.
//
// When the colour reaches `onChange`: at every step of the picker (default),
// once the steps rest for `deferMs`, or only when the picker closes
// (`commitOnBlur`). Other props (`disabled`, `title`) go to the input.
export default function ColorField({
  value, onChange, label, sx, deferMs = 0, commitOnBlur = false, ...inputProps
}) {
  const inputRef = useRef(null);
  const editing = useRef(false);
  const deferredChange = useDebouncedCallback((next) => onChange?.(next), deferMs);
  const shown = value || '#000000';

  useEffect(() => {
    if (!editing.current && inputRef.current) inputRef.current.value = shown;
  }, [shown]);

  const emitChange = (next) => {
    if (commitOnBlur) return;
    if (deferMs) deferredChange(next);
    else onChange?.(next);
  };

  return (
    <Box
      {...inputProps}
      ref={inputRef}
      component="input"
      type="color"
      defaultValue={shown}
      aria-label={label}
      onPointerDown={() => { editing.current = true; }}
      onInput={(event) => emitChange(event.currentTarget.value)}
      // The picker is a window of its own: it is done with when focus comes
      // back, not when the pointer goes up somewhere over the page.
      onBlur={(event) => {
        editing.current = false;
        const next = event.currentTarget.value;
        if (commitOnBlur && next !== shown) onChange?.(next);
      }}
      sx={sx}
    />
  );
}
