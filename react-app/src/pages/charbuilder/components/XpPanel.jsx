import { Box, LinearProgress, Stack, Typography } from '@mui/material';
import { Layers } from 'lucide-react';
import BuilderPanel from './BuilderPanel.jsx';
import { levelFromXp, xpForLevel, xpProgressPct, MAX_LEVEL } from '../../../shared/character/xp.js';
import XpDeltaControl from '../../../shared/character/XpDeltaControl.jsx';

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
          <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>Player Level {trackerLevel}</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
            {isMaxLevel ? `${xp.toLocaleString()} XP` : `${xp.toLocaleString()} / ${nextXp.toLocaleString()} XP`}
          </Typography>
        </Box>
        <LinearProgress variant="determinate" value={progress} />
        <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
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
