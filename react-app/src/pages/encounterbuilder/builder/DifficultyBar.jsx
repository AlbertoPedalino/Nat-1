import { Box, Chip, LinearProgress, Stack, Typography } from '@mui/material';
import { DIFFICULTY_LABELS } from '../state/constants.js';
import { calculateDifficulty } from './difficulty.js';
import { formatNumber } from '../../../shared/ui/numberFormat.js';
import { UI_COLORS, uiAlpha, OPACITY } from '../../../shared/ui/colors.js';

export default function DifficultyBar({ encounter, party }) {
  const difficulty = calculateDifficulty(encounter, party);
  return (
    <Stack spacing={1}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>Total XP</Typography>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography sx={{ fontWeight: 700 }}>{formatNumber(difficulty.totalXp)} XP</Typography>
          <Chip size="small" label={difficulty.label} sx={{ bgcolor: difficulty.color, color: UI_COLORS.onAccent }} />
        </Stack>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={difficulty.percent}
        sx={{
          height: 8,
          borderRadius: 1,
          bgcolor: uiAlpha(UI_COLORS.white, OPACITY.soft),
          '& .MuiLinearProgress-bar': { bgcolor: difficulty.color },
        }}
      />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', md: 'repeat(4,1fr)' }, gap: 1 }}>
        {DIFFICULTY_LABELS.map((label, index) => (
          <Box
            key={label}
            sx={{
              border: '1px solid',
              borderColor: difficulty.difficultyIndex === index ? difficulty.color : 'divider',
              borderRadius: 1,
              p: 1,
              bgcolor: difficulty.difficultyIndex === index ? uiAlpha(UI_COLORS.accent, OPACITY.tint) : uiAlpha(UI_COLORS.white, OPACITY.faint),
            }}
          >
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>{label}</Typography>
            <Typography sx={{ fontWeight: 700 }}>{formatNumber(difficulty.thresholds[index])}</Typography>
          </Box>
        ))}
      </Box>
    </Stack>
  );
}
