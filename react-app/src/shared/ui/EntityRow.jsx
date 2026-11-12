import { Box, Typography } from '@mui/material';
import Caption from './Caption.jsx';
import { SURFACES } from './surfaces.js';
import { UI_COLORS } from './colors.js';
import { DURATIONS } from './motion.js';
import { FONT_WEIGHTS } from './fonts.js';
import {
  BARE_BUTTON_SX, CARD_SX, LIST_ROW_RULE_SX, LIST_ROW_SX, focusRingSx,
} from './interactive.js';
import { asArray } from '../lists.js';

// One row of a list of things — a monster, a saved session, a sheet, a
// linked tool, a compendium entry: what stands for it (`leading`: a token,
// an icon, a colour well), its name in bold on one line with an optional
// `badge` beside it, a `subtitle` caption under it, `children` under those
// (a line of stats, a field), its figures on the right (`meta`: XP, a date)
// and its buttons last (`actions`). Every list draws its rows here, so a
// restyle of what a row looks like is made once.
//
// `surface`: 'wash' (the light row on the page, the default), 'card' (the
// drawn card, lit under the cursor), 'rule' (flush rows split by a hairline,
// for a dense list) or 'none' (only the layout, inside a dialog's own box).
// `wrap` lets a long name break onto more lines instead of being cut.
//
// What opens the thing is the open area: `onClick` makes it a <button>, or
// `component` names what it is (a router Link with `to`, a ListItemButton
// with `selected`, a 'div' with its own role and keys for a drag source);
// every other prop (`to`, `disabled`, `onPointerDown`, `aria-*`…) is the open
// area's. The buttons in `actions` sit beside the open area, never inside
// it, so no button is nested in another. Inside an open area everything is
// a span: a <button> holds only phrasing content. `sx` adds to the row's
// frame.
export default function EntityRow({
  leading = null, title, badge = null, subtitle = null, meta = null, actions = null, children = null,
  onClick, component, selected, surface = 'wash', wrap = false, sx, ...openProps
}) {
  const opens = Boolean(onClick || component);
  const opener = component || 'button';
  const part = opens ? 'span' : 'div';
  const body = (
    <>
      {leading}
      <Box component={part} sx={textSx}>
        <Box component={part} sx={[titleLineSx, wrap && { flexWrap: 'wrap' }]}>
          <Typography component="span" variant="body2" noWrap={!wrap} sx={[titleSx, wrap && WRAP_SX]}>
            {title}
          </Typography>
          {badge}
        </Box>
        {subtitle != null && subtitle !== '' ? (
          <Caption component={part} noWrap={!wrap} sx={[{ display: 'block' }, wrap && WRAP_SX]}>{subtitle}</Caption>
        ) : null}
        {children}
      </Box>
      {meta != null && meta !== '' ? <Caption component="span" sx={metaSx}>{meta}</Caption> : null}
    </>
  );
  const frameSx = [LIST_ROW_SX, SURFACE_SX[surface], opens && OPENS_SX, opens && surface === 'wash' && HOVER_SX];
  const openAreaProps = {
    component: opener,
    ...(opener === 'button' ? { type: 'button' } : null),
    ...(selected === undefined ? null : { selected }),
    onClick,
    ...openProps,
  };
  const openSx = [opener === 'button' && BARE_BUTTON_SX, openAreaSx, focusRingSx()];

  if (!actions) {
    if (!opens) return <Box sx={[...frameSx, ...asArray(sx)]}>{body}</Box>;
    return (
      <Box {...openAreaProps} sx={[...openSx, ...frameSx, opener === 'button' && { width: 1 }, ...asArray(sx)]}>
        {body}
      </Box>
    );
  }
  return (
    <Box sx={[...frameSx, ...asArray(sx)]}>
      {opens ? <Box {...openAreaProps} sx={[...openSx, { flex: 1 }]}>{body}</Box> : body}
      <Box sx={actionsSx}>{actions}</Box>
    </Box>
  );
}

const SURFACE_SX = Object.freeze({
  wash: SURFACES.wash,
  card: CARD_SX,
  // Flush rows take the padding of a dense MUI list item.
  rule: { ...LIST_ROW_RULE_SX, px: 2, py: 0.5 },
  none: { p: 0 },
});

// A row that opens shows the hand over all of it (its open area inherits
// the frame's cursor, so a drag source's grab in `sx` reaches it too).
const OPENS_SX = { cursor: 'pointer' };

// A washed row that opens answers the cursor as a card does.
const HOVER_SX = {
  transition: `border-color ${DURATIONS.fast}ms ease`,
  '&:hover': { borderColor: UI_COLORS.accent },
};

const WRAP_SX = { overflowWrap: 'anywhere' };

const openAreaSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  minWidth: 0,
  color: 'inherit',
  cursor: 'inherit',
  textDecoration: 'none',
};

const textSx = { display: 'block', flex: 1, minWidth: 0 };

const titleLineSx = { display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 };

const titleSx = { display: 'block', minWidth: 0, fontWeight: FONT_WEIGHTS.bold };

const metaSx = { flexShrink: 0, whiteSpace: 'nowrap', textAlign: 'right' };

const actionsSx = { display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 };
