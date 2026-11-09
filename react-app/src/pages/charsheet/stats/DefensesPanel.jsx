import { Box, Chip, Typography } from '@mui/material';
import { chipTintStyle, damageTypeTone } from '../../../shared/ui/entityColors.js';
import { emptyTextSx, sheetBoxSx, sheetBoxTitleSx } from '../../../shared/ui/PanelHeader.jsx';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';

// The "Defenses" box: one chip per defense `{ kind, type, source? }`, kind being
// 'Resist', 'Immune', 'Cond. Immune', 'Adv', 'Trait'… Resistances and
// immunities wear their damage type's hue, an immunity the fuller tint; the
// rest stay neutral. Used by the character's header and by creature panels
// (the Eldritch Cannon), so both read the same.
export default function DefensesPanel({ items = [], emptyText = 'No resistances detected.', sx }) {
  return (
    <Box sx={{ ...sheetBoxSx, p: '0.4rem 0.62rem', ...sx }}>
      <Typography sx={sheetBoxTitleSx}>Defenses</Typography>
      {items.length === 0 && <Typography sx={emptyTextSx}>{emptyText}</Typography>}
      {items.map((d, i) => {
        const tone = d.kind === 'Resist' || d.kind === 'Immune' ? damageTypeTone(d.type) : null;
        const tint = tone ? chipTintStyle(tone, { bgAlpha: d.kind === 'Immune' ? 0.3 : 0.12 }) : null;
        return (
          <Chip
            key={`${d.kind}-${d.type}-${i}`}
            size="small"
            label={`${d.kind} ${d.type}${d.source ? ` · ${d.source}` : ''}`}
            variant="outlined"
            sx={{ fontSize: FONT_SIZES.xxxs, m: 0.25, ...tint }}
          />
        );
      })}
    </Box>
  );
}


