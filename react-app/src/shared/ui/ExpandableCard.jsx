import { useState } from 'react';
import { Box } from '@mui/material';
import CollapsibleBody from './CollapsibleBody.jsx';

// Expandable card shell. Owns the open/closed state and renders three slots:
// `summary` (click target), optional `persistent` controls/status, and
// collapsible `details`. Render-prop slots receive
// `{ open, toggle, disabled }`, so each context keeps its native row styling.
//
// Centralizing the expand mechanic here means a future change — animation,
// single-open accordion, lazy body, telemetry on expand — lives in one place
// instead of being copy-pasted into every row.
function renderSlot(slot, slotProps) {
  if (typeof slot === 'function') return slot(slotProps);
  return slot ?? null;
}

export function ExpandableCard({
  summary,
  persistent,
  details,
  containerSx,
  detailsSx,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const canExpand = !disabled && details != null;
  const visibleOpen = canExpand && open;
  const toggle = () => {
    if (canExpand) setOpen((value) => !value);
  };
  const slotProps = { open: visibleOpen, toggle, disabled: !canExpand };
  return (
    <Box sx={containerSx}>
      {renderSlot(summary, slotProps)}
      {renderSlot(persistent, slotProps)}
      <CollapsibleBody open={visibleOpen}>
        <Box sx={detailsSx}>{details}</Box>
      </CollapsibleBody>
    </Box>
  );
}
