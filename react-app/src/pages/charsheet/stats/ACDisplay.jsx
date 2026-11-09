import { Box, Tooltip, Typography } from '@mui/material';
import { AlertCircle, Shield } from 'lucide-react';
import { UI_COLORS, uiAlpha, OPACITY } from '../../../shared/ui/colors.js';
import { statLabelSx, statValueSx } from '../../../shared/ui/PanelHeader.jsx';
import { FONT_SIZES, FONT_WEIGHTS } from '../../../shared/ui/fonts.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';

// The shield-shaped Armor Class readout: the character's header uses it, and so
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
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
      <Tooltip title={tooltipText}>
        <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 62, height: 68, flexShrink: 0, borderRadius: 1, border: shieldUnproficient ? 1 : 'none', borderColor: shieldUnproficient ? 'warning.main' : 'transparent' }}>
          <Shield size={ICON_SIZES.giant} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', color: shieldUnproficient ? uiAlpha(UI_COLORS.penalty, OPACITY.shade) : uiAlpha(UI_COLORS.accent, OPACITY.fill) }} />
          <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
            <Typography sx={statValueSx}>{value}</Typography>
            <Typography sx={statLabelSx}>AC</Typography>
          </Box>
          {shieldUnproficient && <AlertCircle size={ICON_SIZES.xs} style={{ position: 'absolute', top: 2, right: 2, color: UI_COLORS.penalty }} />}
        </Box>
      </Tooltip>
      {showBadge && badgeLabel ? (
        <Typography sx={{ fontSize: FONT_SIZES.micro, color: UI_COLORS.secondary, fontWeight: FONT_WEIGHTS.bold, textAlign: 'center', lineHeight: 1.1, maxWidth: 72, whiteSpace: 'normal', wordBreak: 'break-word' }}>
          {badgeLabel}
        </Typography>
      ) : null}
    </Box>
  );
}
