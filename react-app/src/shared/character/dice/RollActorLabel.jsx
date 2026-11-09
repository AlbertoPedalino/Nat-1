import { Box, Typography } from '@mui/material';
import { normalizeRollIdentity } from './rollLogPresentation.js';
import { FONT_SIZES, FONT_WEIGHTS } from '../../ui/fonts.js';

export default function RollActorLabel({ entry, sx }) {
  const identity = normalizeRollIdentity(entry);
  const name = entry.actorName || entry.actor;
  if (!name) return null;
  return (
    <Typography component="div" sx={{
      display: 'flex', alignItems: 'center', gap: 0.5, fontSize: FONT_SIZES.sm,
      fontWeight: FONT_WEIGHTS.bold, minWidth: 0, ...sx, color: identity.actorColor || 'text.primary',
    }}>
      {identity.actorShape ? (
        <Box component="span" sx={{ flexShrink: 0 }}>{identity.actorShape}{identity.actorLabel}</Box>
      ) : null}
      <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</Box>
    </Typography>
  );
}
