import { Box, Chip, LinearProgress, Stack, Typography } from '@mui/material';
import { DIFFICULTY_LABELS } from '../logic/constants.js';
import { calculateDifficulty } from '../logic/difficulty.js';
import { formatNumber } from '../logic/monsterUtils.js';

export default function DifficultyBar({ encounter, party }) {
  const difficulty = calculateDifficulty(encounter, party);
  return (
    <Stack spacing={1}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Typography variant="body2" color="text.secondary">Total XP</Typography>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography fontWeight={700}>{formatNumber(difficulty.totalXp)} XP</Typography>
          <Chip size="small" label={difficulty.label} sx={{ bgcolor: difficulty.color, color: '#17120d' }} />
        </Stack>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={difficulty.percent}
        sx={{
          height: 8,
          borderRadius: 1,
          bgcolor: 'rgba(255,255,255,0.08)',
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
              bgcolor: difficulty.difficultyIndex === index ? 'rgba(215,173,82,0.10)' : 'rgba(255,255,255,0.03)',
            }}
          >
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Typography fontWeight={700}>{formatNumber(difficulty.thresholds[index])}</Typography>
          </Box>
        ))}
      </Box>
    </Stack>
  );
}
