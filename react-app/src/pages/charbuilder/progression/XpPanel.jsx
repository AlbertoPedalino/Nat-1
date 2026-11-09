import { Box, LinearProgress, Stack, Typography } from '@mui/material';
import { Layers } from 'lucide-react';
import BuilderPanel from '../layout/BuilderPanel.jsx';
import { levelFromXp, xpForLevel, xpProgressPct, MAX_LEVEL } from '../../../shared/character/progression/xp.js';
import XpDeltaControl from '../../../shared/character/progression/XpDeltaControl.jsx';
import { formatNumber } from '../../../shared/ui/numberFormat.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { FONT_WEIGHTS } from '../../../shared/ui/fonts.js';

export default function XpPanel({ character, dispatch }) {
  const xp = Number(character.xp ?? 0);
  const trackerLevel = levelFromXp(xp);        // player level reached via XP (tracker only)
  const isMaxLevel = trackerLevel >= MAX_LEVEL;
  const nextXp = xpForLevel(trackerLevel + 1);
  const progress = xpProgressPct(xp, trackerLevel);
  const statsLevel = character.level || 1;      // levels chosen in the class panels (drive stats)

  const note = isMaxLevel ? 'Max level (20)' : `${progress}% to player level ${trackerLevel + 1}`;

  return (
    <BuilderPanel id="panel-xp" title="Experience (XP)" icon={Layers} note={note}>
      <Stack spacing={1.25}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: FONT_WEIGHTS.bold, color: 'primary.main' }}>Player Level {trackerLevel}</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
            {isMaxLevel ? `${formatNumber(xp)} XP` : `${formatNumber(xp)} / ${formatNumber(nextXp)} XP`}
          </Typography>
        </Box>
        <LinearProgress variant="determinate" value={progress} />
        <Typography variant="caption" sx={{ ...TEXT_STYLES.note }}>
          Tracker only — stats use class levels (total {statsLevel}).
        </Typography>
        <XpDeltaControl
          currentXp={xp}
          onApply={(total) => dispatch({ type: 'xp/set', value: total })}
          sx={{ gap: 1 }}
        />
      </Stack>
    </BuilderPanel>
  );
}
