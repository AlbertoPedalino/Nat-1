import { Box, Typography } from '@mui/material';
import { UI_COLORS } from '../../../shared/ui/colors.js';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { SURFACES } from '../../../shared/ui/surfaces.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import { LoadingLine } from '../../../shared/ui/LoadStatus.jsx';

// The panel that opens under a sheet row when it is expanded: an action's
// details, a beast form, a familiar, a summon, a cannon, the items a feature
// creates. Every one is a DetailPanel, so their surface, header and footnote
// change in one place.
//
// - Clicks inside never reach the row behind it, which would fold the panel.
// - The header is a gold `icon`, the `title` in the title lettering, then
//   `titleNode` (a beast's name as a link), and at the end either `meta` (a
//   quiet count: "Ranger 5", "1/2 active") or `aside` (anything else held at
//   the end: a Dismiss button, a coloured count).
//   No header without an icon, a title or a title node.
// - `status` stands in for the body while there is nothing to show yet:
//   'loading' is the LoadingLine with `loadingLabel`; 'unavailable' is
//   `unavailableText` as a quiet line, and 'error' the same line in the error
//   colour (the data could not be fetched). detailStatus() works it out from a
//   load status.
// - `sx` is for placement only.
//
// A DetailNote is the quiet italic line under the body: what an action spends,
// what the form keeps. `warn` turns it to the muted danger colour when there is
// nothing left to spend.

const PANEL_SX = {
  ...SURFACES.wash,
  mt: 0.75,
  p: 1,
};

const HEADER_SX = { display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 };

// The small gold title of a detail panel, also the heading of a part inside
// one (a stat block's Actions, a cannon's board) at a smaller size.
export const detailTitleSx = {
  ...TEXT_STYLES.title,
  fontSize: FONT_SIZES.sm,
  color: UI_COLORS.accentText,
};

// Held at the end of the header at its own size; a flex box, so a button in
// it adds no line height.
const ASIDE_SX = { ml: 'auto', flexShrink: 0, display: 'flex', alignItems: 'center' };

// The quiet small text of a detail panel: the count beside its title, its
// status line, a stat block's lines.
export const detailMetaSx = { fontSize: FONT_SIZES.xs, color: 'text.secondary' };

const NOTE_SX = { ...TEXT_STYLES.note, ...detailMetaSx, mt: 0.5 };

// The status a creature panel shows from its records' load status and whether
// the creature could be built from them.
export function detailStatus(loadStatus, ready) {
  if (loadStatus === 'loading') return 'loading';
  if (ready) return null;
  return loadStatus === 'error' ? 'error' : 'unavailable';
}

export default function DetailPanel({
  icon: Icon,
  title,
  titleNode,
  meta,
  aside,
  status = null,
  loadingLabel,
  unavailableText,
  children,
  sx,
}) {
  const hasHeader = Boolean(Icon || title || titleNode);
  return (
    <Box onClick={(event) => event.stopPropagation()} sx={[PANEL_SX, sx]}>
      {status === 'loading' ? <LoadingLine label={loadingLabel} /> : null}
      {status === 'unavailable' || status === 'error' ? (
        <Typography sx={[detailMetaSx, status === 'error' && { color: 'error.main' }]}>{unavailableText}</Typography>
      ) : null}
      {!status && hasHeader ? (
        <Box sx={HEADER_SX}>
          {Icon ? <Icon size={ICON_SIZES.sm} color={UI_COLORS.accentText} /> : null}
          {title ? <Typography sx={detailTitleSx} component="span">{title}</Typography> : null}
          {titleNode}
          {meta != null ? <Typography sx={[detailMetaSx, { ml: 'auto' }]}>{meta}</Typography> : null}
          {aside ? <Box sx={ASIDE_SX}>{aside}</Box> : null}
        </Box>
      ) : null}
      {status ? null : children}
    </Box>
  );
}

export function DetailNote({ warn = false, children, sx }) {
  return (
    <Typography sx={[NOTE_SX, warn && { color: UI_COLORS.dangerMuted }, sx]}>
      {children}
    </Typography>
  );
}
