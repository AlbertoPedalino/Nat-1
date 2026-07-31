import { Box, Button, IconButton, Paper, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { ExternalLink, Minus, Plus, Trash2 } from 'lucide-react';
import { campaignSheetUrl } from '../logic/campaignSheetUrl.js';
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
              <ColorSwatch
                value={player.color || '#5c8fe0'}
                onChange={(value) => dispatch({ type: 'updatePlayer', index, patch: { color: value } })}
                label={`${player.name} color`}
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
              <TextField
                size="small"
                label="Init"
                type="number"
                value={player.initMod}
                onChange={(event) => dispatch({ type: 'updatePlayer', index, patch: { initMod: event.target.value } })}
                sx={{ width: 78 }}
              />
              <Tooltip title="Remove from encounter">
                <IconButton size="small" color="error" onClick={() => dispatch({ type: 'removePlayer', index })}>
                  <Trash2 size={15} />
                </IconButton>
              </Tooltip>
            </Box>
          ))}
        </Stack>
      </Stack>
    </Paper>
  );
}

// Shared −/value/+ controls. Renders 3 grid cells; parent owns the grid + label.
function StepperControls({ label, value, min, max, onChange }) {
  return (
    <>
      <Tooltip title={`Decrease ${label}`}>
        <span>
          <IconButton size="small" disabled={value <= min} onClick={() => onChange(value - 1)}>
            <Minus size={14} />
          </IconButton>
        </span>
      </Tooltip>
      <Typography fontWeight={700} sx={{ width: 34, textAlign: 'center' }}>
        {value}
      </Typography>
      <Tooltip title={`Increase ${label}`}>
        <span>
          <IconButton size="small" disabled={value >= max} onClick={() => onChange(value + 1)}>
            <Plus size={14} />
          </IconButton>
        </span>
      </Tooltip>
    </>
  );
}

// Boxed pill, uppercase label inline left. For top-level party knobs (PCs, Level).
function Stepper(props) {
  return (
    <Box sx={{ ...stepperGroupSx, display: 'grid', gridTemplateColumns: 'auto auto auto auto', gap: 0.5, alignItems: 'center' }}>
      <Typography variant="caption" sx={stepperLabelSx}>{props.label}</Typography>
      <StepperControls {...props} />
    </Box>
  );
}

// Circular swatch wrapping the native color input (MUI ships no color picker).
function ColorSwatch({ value, onChange, label }) {
  return (
    <Box
      component="input"
      type="color"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={label}
      sx={colorSwatchSx}
    />
  );
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

const stepperGroupSx = {
  px: 1,
  py: 0.5,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 1,
  bgcolor: 'rgba(255,255,255,0.025)',
};

const stepperLabelSx = {
  mr: 0.75,
  fontWeight: 700,
  color: 'text.primary',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
};

const colorSwatchSx = (theme) => ({
  width: 28,
  height: 28,
  flexShrink: 0,
  p: 0,
  bgcolor: 'transparent',
  border: 'none',
  borderRadius: '50%',
  cursor: 'pointer',
  appearance: 'none',
  WebkitAppearance: 'none',
  boxShadow: `0 0 0 1px ${theme.palette.divider}, inset 0 0 0 2px ${theme.palette.background.paper}`,
  '&::-webkit-color-swatch-wrapper': { p: 0 },
  '&::-webkit-color-swatch': { border: 'none', borderRadius: '50%' },
  '&::-moz-color-swatch': { border: 'none', borderRadius: '50%' },
});
