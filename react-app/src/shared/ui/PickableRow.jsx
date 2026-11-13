import { ListItemButton } from '@mui/material';
import { ExpandableCard } from './ExpandableCard.jsx';
import { LIST_ROW_RULE_SX } from './interactive.js';
import { OPACITY } from './colors.js';
import { ENTRY_BODY_SX, ENTRY_ROW_PADDING } from './entryCard.js';

// An entry offered to take (entryCard.js): a spell in a picker, an item to add
// or to create. A ruled row of its list (lay the list in scrollWellSx), the
// head as `children` with its one action at the right — the action stops its
// click, so it does not also open the row — and `details` opened below on the
// entry body. `selected` (already taken) is the theme's selected row; `dimmed`
// one that cannot be taken now (a full list).
export default function PickableRow({ selected = false, dimmed = false, details, children, sx }) {
  return (
    <ExpandableCard
      containerSx={{ ...LIST_ROW_RULE_SX, ...(dimmed ? { opacity: OPACITY.strong } : null) }}
      detailsSx={ENTRY_BODY_SX}
      details={details}
      summary={({ open, toggle }) => (
        <ListItemButton
          selected={selected}
          aria-expanded={open}
          onClick={toggle}
          sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, ...ENTRY_ROW_PADDING, ...sx }}
        >
          {children}
        </ListItemButton>
      )}
    />
  );
}
