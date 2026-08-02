import { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';

// A native colour well that does not fight the picker it opens.
//
// A plain controlled `<input type="color">` jumps while you drag inside the
// picker: every move fires a change, React re-renders, and writing the value
// back into the input snaps the widget away from the pointer. So the input
// holds its own value while it is being used, and takes one from outside again
// only once it is done — which is also the only time an outside change can mean
// anything.
export default function ColorField({ value, onChange, label, sx }) {
  const [shown, setShown] = useState(value);
  const editing = useRef(false);

  useEffect(() => {
    if (!editing.current) setShown(value);
  }, [value]);

  return (
    <Box
      component="input"
      type="color"
      value={shown || '#000000'}
      aria-label={label}
      onPointerDown={() => { editing.current = true; }}
      onChange={(event) => {
        setShown(event.target.value);
        onChange?.(event.target.value);
      }}
      // The picker is a window of its own: it is done with when focus comes
      // back, not when the pointer goes up somewhere over the page.
      onBlur={() => { editing.current = false; }}
      sx={sx}
    />
  );
}
