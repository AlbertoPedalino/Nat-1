import { Box, LinearProgress, Stack, Typography } from '@mui/material';
import { DIFFICULTY_LABELS } from '../state/constants.js';
import { calculateDifficulty } from './difficulty.js';
import { formatNumber } from '../../../shared/ui/numberFormat.js';
import { UI_COLORS } from '../../../shared/ui/colors.js';
import { SURFACES, meterTrackSx, tintedSurfaceSx } from '../../../shared/ui/surfaces.js';
import { FONT_WEIGHTS } from '../../../shared/ui/fonts.js';
import TagChip from '../../../shared/ui/TagChip.jsx';
import Caption from '../../../shared/ui/Caption.jsx';

export default function DifficultyBar({ encounter, party }) {
  const difficulty = calculateDifficulty(encounter, party);
  return (
    <Stack spacing={1}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>Total XP</Typography>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography sx={{ fontWeight: FONT_WEIGHTS.bold }}>{formatNumber(difficulty.totalXp)} XP</Typography>
          <TagChip label={difficulty.label} tone={difficulty.color} />
        </Stack>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={difficulty.percent}
        sx={{ ...meterTrackSx(8), '& .MuiLinearProgress-bar': { bgcolor: difficulty.color } }}
      />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', md: 'repeat(4,1fr)' }, gap: 1 }}>
        {DIFFICULTY_LABELS.map((label, index) => (
          <Box
            key={label}
            sx={{
              ...SURFACES.wash,
              p: 1,
              // The band the encounter falls in: edged in its colour.
              ...(difficulty.difficultyIndex === index
                ? { borderColor: difficulty.color, ...tintedSurfaceSx(UI_COLORS.accent) }
                : null),
            }}
          >
            <Caption>{label}</Caption>
            <Typography sx={{ fontWeight: FONT_WEIGHTS.bold }}>{formatNumber(difficulty.thresholds[index])}</Typography>
          </Box>
        ))}
      </Box>
    </Stack>
  );
}
