import { Box, Tooltip, Typography } from '@mui/material';
import { AlertCircle, Shield } from 'lucide-react';
import { UI_COLORS, uiAlpha } from '../../../shared/ui/colors.js';
import { UI_FONTS } from '../../../shared/ui/fonts.js';

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
          <Shield size={62} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', color: shieldUnproficient ? uiAlpha(UI_COLORS.orange, 0.2) : uiAlpha(UI_COLORS.gold, 0.14) }} />
          <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
            <Typography sx={{ fontFamily: UI_FONTS.display, fontSize: '1.25rem', fontWeight: 700, color: UI_COLORS.goldLight, lineHeight: 1 }}>{value}</Typography>
            <Typography sx={{ fontFamily: UI_FONTS.display, fontSize: '0.44rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'text.secondary' }}>AC</Typography>
          </Box>
          {shieldUnproficient && <AlertCircle size={12} style={{ position: 'absolute', top: 2, right: 2, color: UI_COLORS.orange }} />}
        </Box>
      </Tooltip>
      {showBadge && badgeLabel ? (
        <Typography sx={{ fontSize: '0.45rem', color: UI_COLORS.teal, fontWeight: 700, textAlign: 'center', lineHeight: 1.1, maxWidth: 72, whiteSpace: 'normal', wordBreak: 'break-word' }}>
          {badgeLabel}
        </Typography>
      ) : null}
    </Box>
  );
}
