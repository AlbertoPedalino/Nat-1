import { Box, Button, IconButton, Paper, Stack, Typography } from '@mui/material';
import { Trash2, X } from 'lucide-react';
import { useEncounterBuilder } from '../state/EncounterBuilderContext.jsx';
import RollActorLabel from '../../../shared/character/RollActorLabel.jsx';
import { rollOutcome } from '../../../shared/character/rollLogPresentation.js';

export default function RollLog({ maxHeight = 320, onClose, sx }) {
  const { state, dispatch } = useEncounterBuilder();
  return (
    <Paper sx={{ p: 2, bgcolor: 'background.paper', ...sx }}>
      <Stack spacing={1.5}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Typography variant="h2">Roll Log</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Button size="small" variant="outlined" color="error" startIcon={<Trash2 size={14} />} onClick={() => dispatch({ type: 'clearRollLog' })} disabled={!state.rollLog.length}>
              Clear
            </Button>
            {onClose ? (
              <IconButton size="small" onClick={onClose} aria-label="Close roll log">
                <X size={16} />
              </IconButton>
            ) : null}
          </Box>
        </Stack>
        <Stack spacing={0.75} sx={{ maxHeight, overflow: 'auto' }}>
          {state.rollLog.length ? state.rollLog.map((entry, index) => (
            <Box key={`${entry.timeStr}-${index}`} sx={entrySx}>
              <Box sx={{ ...resultSx, color: rollOutcome(entry).color }}>{entry.result ?? '—'}</Box>
              <Box sx={{ minWidth: 0 }}>
                <RollActorLabel entry={entry} />
                <Typography fontWeight={700} noWrap>{entry.type}</Typography>
                {entry.visibility === 'gm' ? <Typography variant="caption" color="text.secondary">GM only</Typography> : null}
                {entry.note ? (
                  <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', whiteSpace: 'normal', lineHeight: 1.35 }}>
                    {entry.note}
                  </Typography>
                ) : null}
                <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>{entry.mathStr}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{entry.timeStr}</Typography>
              </Box>
            </Box>
          )) : (
            <Typography color="text.secondary" sx={{ py: 2 }}>No rolls yet. Click statblock dice, attacks, or abilities.</Typography>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}

const entrySx = {
  display: 'grid',
  gridTemplateColumns: '42px minmax(0,1fr)',
  gap: 1,
  alignItems: 'center',
  p: 1,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 1,
  bgcolor: 'rgba(255,255,255,0.025)',
};

const resultSx = {
  width: 38,
  height: 38,
  borderRadius: 1,
  display: 'grid',
  placeItems: 'center',
  fontWeight: 800,
  bgcolor: 'rgba(255,255,255,0.04)',
};
