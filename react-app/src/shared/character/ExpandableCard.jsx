import { useState } from 'react';
import { Box } from '@mui/material';
import CollapsibleBody from './CollapsibleBody.jsx';

// Expandable card shell. Owns the open/closed state and renders three slots:
// `summary` (click target), optional `persistent` controls/status, and
// collapsible `details`. The legacy `header`/`body` names remain supported for
// callers that only need a simple expandable row. Render-prop slots receive
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
  header,
  body,
  summary,
  persistent,
  details,
  containerSx,
  bodySx,
  detailsSx,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const detailContent = details !== undefined ? details : body;
  const summaryContent = summary !== undefined ? summary : header;
  const canExpand = !disabled && detailContent != null;
  const visibleOpen = canExpand && open;
  const toggle = () => {
    if (canExpand) setOpen((value) => !value);
  };
  const slotProps = { open: visibleOpen, toggle, disabled: !canExpand };
  return (
    <Box sx={containerSx}>
      {renderSlot(summaryContent, slotProps)}
      {renderSlot(persistent, slotProps)}
      <CollapsibleBody open={visibleOpen}>
        <Box sx={detailsSx ?? bodySx}>{detailContent}</Box>
      </CollapsibleBody>
    </Box>
  );
}
