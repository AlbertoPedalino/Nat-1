import { Box, Tooltip, Typography } from '@mui/material';
import { AlertCircle } from 'lucide-react';
import { UI_COLORS } from '../../../shared/ui/colors.js';
import { statValueSx } from '../../../shared/ui/PanelHeader.jsx';
import { FONT_SIZES, FONT_WEIGHTS, LINE_HEIGHTS } from '../../../shared/ui/fonts.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import { GAME_ICONS } from '../../../shared/ui/gameIcons.js';
import { inkOutlineFilter } from '../../../shared/ui/shadows.js';
import { PANEL_TONES } from '../../../shared/ui/entityColors.js';
import StatTile from './StatTile.jsx';

// The Armor Class tile, the shield drawn behind its figure: the character's header uses it, and so
// do creature panels (the Eldritch Cannon), so an AC reads the same everywhere.
// `shieldUnproficient` flags an untrained Shield; `source` fills the tooltip and,
// with `showBadge`, a caption under the shield (e.g. an AC formula).
export default function ACDisplay({ value, shieldUnproficient, source, showBadge, badgeLabel }) {
  const tooltipText = shieldUnproficient
    ? "Shield not proficient - no AC bonus"
    : source
      ? `AC ${value} — ${source}`
      : '';
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 0.25, minWidth: 0 }}>
      <Tooltip title={tooltipText}>
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <StatTile
            tone={shieldUnproficient ? UI_COLORS.penalty : PANEL_TONES.armorClass}
            label="Armor Class"
            value={(
              <Box sx={shieldSx}>
                {/* A drawn shield behind the figure, inked; an untrained Shield
                    turns it to the penalty colour. */}
                <GAME_ICONS.armorClass
                  size={ICON_SIZES.giant}
                  style={{
                    position: 'absolute', inset: 0, width: '100%', height: '100%',
                    color: shieldUnproficient ? UI_COLORS.dangerSurface : UI_COLORS.surfaceRaised,
                    filter: inkOutlineFilter(UI_COLORS.edge, shieldUnproficient ? UI_COLORS.penalty : UI_COLORS.edge),
                  }}
                />
                <Typography sx={{ ...statValueSx, position: 'relative', zIndex: 1 }}>{value}</Typography>
                {shieldUnproficient && <AlertCircle size={ICON_SIZES.xs} style={{ position: 'absolute', top: 0, right: -4, color: UI_COLORS.penalty }} />}
              </Box>
            )}
          />
        </Box>
      </Tooltip>
      {showBadge && badgeLabel ? (
        <Typography sx={{ fontSize: FONT_SIZES.micro, color: UI_COLORS.secondary, fontWeight: FONT_WEIGHTS.bold, textAlign: 'center', lineHeight: LINE_HEIGHTS.tight, whiteSpace: 'normal', wordBreak: 'break-word' }}>
          {badgeLabel}
        </Typography>
      ) : null}
    </Box>
  );
}

const shieldSx = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 48,
  height: 52,
  my: 0.5,
};
