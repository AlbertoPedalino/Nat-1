import { Box, Chip, Typography } from '@mui/material';
import { chipTintStyle, damageTypeTone } from '../../../shared/ui/entityColors.js';

// The "Defenses" box: one chip per defense `{ kind, type, source? }`, kind being
// 'Resist', 'Immune', 'Cond. Immune', 'Adv', 'Trait'… Resistances and
// immunities wear their damage type's hue, an immunity the fuller tint; the
// rest stay neutral. Used by the character's header and by creature panels
// (the Eldritch Cannon), so both read the same.
export default function DefensesPanel({ items = [], emptyText = 'No resistances detected.', sx }) {
  return (
    <Box sx={{ bgcolor: 'rgba(35,32,26,1)', border: 1, borderColor: 'divider', borderRadius: 1, p: '0.4rem 0.62rem', ...sx }}>
      <Typography sx={titleSx}>Defenses</Typography>
      {items.length === 0 && <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', fontStyle: 'italic' }}>{emptyText}</Typography>}
      {items.map((d, i) => {
        const tone = d.kind === 'Resist' || d.kind === 'Immune' ? damageTypeTone(d.type) : null;
        const tint = tone ? chipTintStyle(tone, { bgAlpha: d.kind === 'Immune' ? 0.3 : 0.12 }) : null;
        return (
          <Chip
            key={`${d.kind}-${d.type}-${i}`}
            size="small"
            label={`${d.kind} ${d.type}${d.source ? ` · ${d.source}` : ''}`}
            variant="outlined"
            sx={{ fontSize: '0.5rem', m: 0.15, ...tint }}
          />
        );
      })}
    </Box>
  );
}

const titleSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.625rem',
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'primary.main',
  mb: 0.4,
};
