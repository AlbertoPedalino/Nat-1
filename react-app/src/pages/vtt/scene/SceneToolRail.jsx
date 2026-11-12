import { useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { MousePointer2 } from 'lucide-react';
import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import { SURFACES } from '../../../shared/ui/surfaces.js';
import { FONT_SIZES, LINE_HEIGHTS } from '../../../shared/ui/fonts.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { OPACITY } from '../../../shared/ui/colors.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import { DURATIONS } from '../../../shared/ui/motion.js';
import { BARE_BUTTON_SX } from '../../../shared/ui/interactive.js';
import MapFloatingPanel from '../map/MapFloatingPanel.jsx';

// A vertical rail of icons down the right edge of the map; clicking one opens
// its settings in a panel immediately to the left.
//
// The rail replaces a single drawer that held everything at once: one column of
// controls over a battlemap covered the board it was meant to adjust. Only one
// group is open at a time, and the panel is anchored rather than modal so the
// map stays visible and usable behind it.
// The cursor's own panel, when given, holds its modes (pointer or box select):
// the cursor button then opens it like any other tool.
export default function SceneToolRail({
  groups, activeId = 'cursor', onCursor, cursorContent = null, placing = false,
}) {
  const [openId, setOpenId] = useState(null);
  const cursorGroup = cursorContent ? { id: 'cursor', label: 'Cursor', content: cursorContent } : null;
  const open = (openId === 'cursor' ? cursorGroup : groups.find((group) => group.id === openId)) || null;
  const closePanel = () => setOpenId(null);

  return (
    <>
      <Stack data-viewport-control spacing={0.5} sx={railSx}>
        <Box
          component="button"
          type="button"
          aria-label="Normal cursor"
          aria-pressed={activeId === 'cursor'}
          onClick={() => {
            // A second click only folds the cursor's panel away: box select,
            // if chosen there, stays on.
            if (openId === 'cursor') {
              closePanel();
              return;
            }
            onCursor?.();
            setOpenId(cursorGroup ? 'cursor' : null);
          }}
          sx={{ ...railButtonSx, ...(activeId === 'cursor' ? railButtonActiveSx : null) }}
        >
          <MousePointer2 size={ICON_SIZES.md} />
          <Typography component="span" sx={railLabelSx}>Cursor</Typography>
        </Box>

        {groups.map((group) => {
          const Icon = group.icon;
          const panelOpen = openId === group.id;
          const active = activeId === group.id || (!group.onActivate && panelOpen);
          return (
            <Box
              key={group.id}
              component="button"
              type="button"
              aria-pressed={active}
              onClick={() => {
                group.onActivate?.();
                setOpenId(panelOpen ? null : group.id);
              }}
              sx={{ ...railButtonSx, ...(active ? railButtonActiveSx : null) }}
            >
              <Icon size={ICON_SIZES.md} />
              <Typography component="span" sx={railLabelSx}>{group.label}</Typography>
            </Box>
          );
        })}
      </Stack>

      {/* A plain panel, not a Popover. A Popover lays an invisible backdrop over
          the map: its click closed the panel and the same click reopened it from
          the button underneath, so it never appeared to close at all. It also
          portals to the document root, which a fullscreen element hides. */}
      {open ? (
        <MapFloatingPanel
          data-viewport-control
          title={open.label}
          onClose={closePanel}
          sx={[panelSx, placing && panelPlacingSx]}
        >
          {typeof open.content === 'function' ? open.content({ closePanel }) : open.content}
        </MapFloatingPanel>
      ) : null}
    </>
  );
}

const railSx = {
  ...SURFACES.map,
  position: 'absolute',
  top: 48,
  right: 8,
  zIndex: 6,
  p: 0.5,
  borderRadius: 1,
  maxHeight: 'calc(100% - 96px)',
  overflowY: 'auto',
};

const railButtonSx = {
  ...BARE_BUTTON_SX,
  width: 62,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  gap: 0.25,
  px: 0.5,
  py: 0.75,
  borderRadius: 1,
  color: VTT_COLORS.textSecondary,
  '&:hover': { color: VTT_COLORS.accent, bgcolor: vttAlpha(VTT_COLORS.accent, OPACITY.soft) },
};

const railButtonActiveSx = {
  color: VTT_COLORS.surface,
  bgcolor: VTT_COLORS.accent,
  '&:hover': { color: VTT_COLORS.surface, bgcolor: VTT_COLORS.accent },
};

const railLabelSx = {
  ...TEXT_STYLES.title,
  fontSize: FONT_SIZES.xxs,
  lineHeight: LINE_HEIGHTS.tight,
  textAlign: 'center',
};

// Immediately to the left of the rail, and scrollable rather than tall: a panel
// that runs past the bottom of the map would be unreachable in fullscreen.
const panelSx = {
  position: 'absolute',
  top: 48,
  right: 80,
  zIndex: 6,
  width: { xs: 260, sm: 330 },
  maxHeight: 'calc(100% - 104px)',
  transition: `opacity ${DURATIONS.fast}ms ease`,
};

// Keep the drag source mounted and stationary. A quiet fade reveals the board
// without the distracting sideways flight, then reverses when the piece lands.
const panelPlacingSx = {
  opacity: 0,
  pointerEvents: 'none',
};
