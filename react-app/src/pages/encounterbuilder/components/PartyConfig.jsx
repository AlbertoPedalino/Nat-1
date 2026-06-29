import { Box, Button, IconButton, Paper, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { ExternalLink, Minus, Plus } from 'lucide-react';
import { useEncounterBuilder } from '../state/EncounterBuilderContext.jsx';

export default function PartyConfig() {
  const { state, dispatch } = useEncounterBuilder();

  return (
    <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
      <Stack spacing={2}>
        <Typography variant="h2">Party</Typography>
        <Stack direction="row" spacing={1}>
          <Stepper
            label="PCs"
            value={state.party.count}
            min={1}
            max={10}
            onChange={(value) => dispatch({ type: 'setPartyCount', value })}
          />
          <Stepper
            label="Level"
            value={state.party.level}
            min={1}
            max={20}
            onChange={(value) => dispatch({ type: 'setPartyLevel', value })}
          />
        </Stack>
        <Stack spacing={1}>
          {state.players.map((player, index) => (
            <Box key={player.id ?? index} sx={playerRowSx}>
              <Box
                component="input"
                type="color"
                value={player.color || '#5c8fe0'}
                onChange={(event) => dispatch({ type: 'updatePlayer', index, patch: { color: event.target.value } })}
                sx={colorInputSx}
                aria-label={`${player.name} color`}
              />
              {player.sourceId ? (
                <Button
                  component="a"
                  href={campaignSheetUrl(player.sourceId)}
                  target="_blank"
                  rel="noopener"
                  size="small"
                  endIcon={<ExternalLink size={13} />}
                  sx={{ justifyContent: 'flex-start', minWidth: 0, flex: 1 }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{player.name}</span>
                </Button>
              ) : (
                <TextField
                  size="small"
                  label="Name"
                  value={player.name}
                  onChange={(event) => dispatch({ type: 'updatePlayer', index, patch: { name: event.target.value } })}
                  sx={{ flex: 1, minWidth: 140 }}
                />
              )}
              <TextField
                size="small"
                label="HP"
                type="number"
                value={player.hpMax}
                onChange={(event) => dispatch({ type: 'updatePlayer', index, patch: { hpMax: event.target.value } })}
                sx={{ width: 86 }}
              />
              <TextField
                size="small"
                label="AC"
                type="number"
                value={player.ac}
                onChange={(event) => dispatch({ type: 'updatePlayer', index, patch: { ac: event.target.value } })}
                sx={{ width: 78 }}
              />
              <Stepper
                compact
                label="Init"
                value={player.initMod}
                min={-20}
                max={30}
                onChange={(value) => dispatch({ type: 'updatePlayer', index, patch: { initMod: value } })}
              />
            </Box>
          ))}
        </Stack>
      </Stack>
    </Paper>
  );
}

function Stepper({ label, value, min, max, onChange, compact = false }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: compact ? 'auto auto auto' : '1fr auto auto', gap: 0.5, alignItems: 'center', minWidth: compact ? 112 : 120 }}>
      <Typography variant="caption" color="text.secondary" sx={{ gridColumn: compact ? '1 / -1' : 'auto' }}>{label}</Typography>
      <Tooltip title={`Decrease ${label}`}>
        <span>
          <IconButton size="small" disabled={value <= min} onClick={() => onChange(value - 1)}>
            <Minus size={14} />
          </IconButton>
        </span>
      </Tooltip>
      <Typography fontWeight={700} sx={{ minWidth: 28, textAlign: 'center' }}>{value >= 0 && compact ? `+${value}` : value}</Typography>
      <Tooltip title={`Increase ${label}`}>
        <span>
          <IconButton size="small" disabled={value >= max} onClick={() => onChange(value + 1)}>
            <Plus size={14} />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
}

function campaignSheetUrl(id) {
  const base = import.meta.env.BASE_URL.replace(/\/+$/, '');
  return `${base}/campaign-sheet?id=${encodeURIComponent(id)}&edit=1`;
}

const playerRowSx = {
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 1,
  p: 1,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 1,
  bgcolor: 'rgba(255,255,255,0.025)',
};

const colorInputSx = {
  width: 30,
  height: 30,
  border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: 1,
  bgcolor: 'transparent',
  p: 0,
};
