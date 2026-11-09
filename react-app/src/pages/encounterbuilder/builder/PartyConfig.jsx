import { Box, Button, IconButton, Paper, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { ExternalLink, Trash2 } from 'lucide-react';
import PortraitBadge from '../../../shared/character/profile/PortraitBadge.jsx';
import ColorField from '../../../shared/ui/ColorField.jsx';
import { campaignSheetUrl } from '../../../shared/character/profile/characterRoutes.js';
import { useEncounterBuilder } from '../state/EncounterBuilderContext.jsx';
import { UI_COLORS, uiAlpha, OPACITY } from '../../../shared/ui/colors.js';
import CountStepper from '../../../shared/ui/CountStepper.jsx';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';

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
              {/* A character imported from a campaign wears the colour their
                  own sheet chose, so there is nothing to pick here: the badge
                  shows it, and the sheet is where it is changed. Somebody typed
                  straight into the encounter has no sheet, and keeps the well. */}
              {player.sourceId ? (
                <PortraitBadge path={player.portraitPath} color={player.color} size={30} />
              ) : (
                <ColorField
                  value={player.color || UI_COLORS.pcToken}
                  onChange={(value) => dispatch({ type: 'updatePlayer', index, patch: { color: value } })}
                  label={`${player.name} color`}
                  size={28} tone="app" round
                />
              )}
              {player.sourceId ? (
                <Button
                  component="a"
                  href={campaignSheetUrl(player.sourceId, { edit: true })}
                  target="_blank"
                  rel="noopener"
                  size="small"
                  endIcon={<ExternalLink size={13} />}
                  sx={{ justifyContent: 'flex-start', minWidth: 0, flex: 1 }}
                >
                  <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{player.name}</Box>
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
// Boxed pill, uppercase label inline left. For top-level party knobs (PCs, Level).
function Stepper(props) {
  return (
    <Box sx={{ ...stepperGroupSx, display: 'flex', gap: 0.5, alignItems: 'center' }}>
      <Typography variant="caption" sx={stepperLabelSx}>{props.label}</Typography>
      <CountStepper
        value={props.value}
        size={24}
        label={props.label}
        canDecrease={props.value > props.min}
        canIncrease={props.value < props.max}
        onStep={(delta) => props.onChange(props.value + delta)}
      />
    </Box>
  );
}

// Circular swatch wrapping the native color input (MUI ships no color picker).
const playerRowSx = {
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 1,
  p: 1,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 1,
  bgcolor: uiAlpha(UI_COLORS.white, OPACITY.faint),
};

const stepperGroupSx = {
  px: 1,
  py: 0.5,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 1,
  bgcolor: uiAlpha(UI_COLORS.white, OPACITY.faint),
};

const stepperLabelSx = {
  mr: 0.75,
  ...TEXT_STYLES.label,
  color: 'text.primary',
  
};

