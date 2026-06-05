import { useState } from 'react';
import { Box } from '@mui/material';
import CollapsibleBody from './CollapsibleBody.jsx';

// Expandable card shell. Owns the open/closed state and renders the collapsible
// body; the header chrome is fully caller-controlled via the `header`
// render-prop (receives `{ open, toggle }`), so each context keeps its native
// row styling — MUI ListItemButton, dark dialog Box, etc. `body` is the
// collapsed content (e.g. SpellReferenceBody / ItemReferenceBody).
//
// Centralizing the expand mechanic here means a future change — animation,
// single-open accordion, lazy body, telemetry on expand — lives in one place
// instead of being copy-pasted into every row.
export function ExpandableCard({ header, body, containerSx, bodySx }) {
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen((value) => !value);
  return (
    <Box sx={containerSx}>
      {header({ open, toggle })}
      <CollapsibleBody open={open}>
        <Box sx={bodySx}>{body}</Box>
      </CollapsibleBody>
    </Box>
  );
}
