import { useLayoutEffect, useRef } from 'react';
import { Box } from '@mui/material';
import { scrollWellSx } from './surfaces.js';

// A list that scrolls in a sunken well. When it opens, its first selected row
// (the theme's .Mui-selected) is scrolled to the middle of the well, so a choice
// made earlier is in view without hunting for it. Only the well scrolls, never
// the page. It happens on opening and when `revealKey` changes (another tab,
// level or class shown in the same well) — never while picking or searching,
// so the list does not jump under the pointer.
export default function ScrollWell({ maxHeight, revealKey, sx, children }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const well = ref.current;
    if (!well || !well.clientHeight) return;
    const row = well.querySelector('.Mui-selected');
    if (!row) {
      well.scrollTop = 0;
      return;
    }
    const offset = row.getBoundingClientRect().top - well.getBoundingClientRect().top + well.scrollTop;
    well.scrollTop = Math.max(0, offset - (well.clientHeight - row.offsetHeight) / 2);
    // Only on opening and on a new revealKey: not on every render.
  }, [revealKey]);

  return (
    <Box ref={ref} sx={{ ...scrollWellSx(maxHeight), ...sx }}>
      {children}
    </Box>
  );
}
