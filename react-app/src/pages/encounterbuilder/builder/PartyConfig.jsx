import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import { ExternalLink, Trash2, Users } from 'lucide-react';
import PortraitBadge from '../../../shared/character/profile/PortraitBadge.jsx';
import ColorField from '../../../shared/ui/ColorField.jsx';
import { campaignSheetUrl } from '../../../shared/character/profile/characterRoutes.js';
import { useEncounterBuilder } from '../state/EncounterBuilderContext.jsx';
import { UI_COLORS } from '../../../shared/ui/colors.js';
import CountStepper from '../../../shared/ui/CountStepper.jsx';
import { TEXT_STYLES, ONE_LINE_SX } from '../../../shared/ui/textStyles.js';
import { SURFACES } from '../../../shared/ui/surfaces.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import Panel from '../../../shared/ui/Panel.jsx';
import TipIconButton from '../../../shared/ui/TipIconButton.jsx';

export default function PartyConfig() {
  const { state, dispatch } = useEncounterBuilder();

  return (
    <Panel icon={Users} title="Party">
      <Stack spacing={2}>
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
                  endIcon={<ExternalLink size={ICON_SIZES.xs} />}
                  sx={{ justifyContent: 'flex-start', minWidth: 0, flex: 1 }}
                >
                  <Box component="span" sx={ONE_LINE_SX}>{player.name}</Box>
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
              <TipIconButton title="Remove from encounter" size="small" color="error" onClick={() => dispatch({ type: 'removePlayer', index })}>
                <Trash2 size={ICON_SIZES.sm} />
              </TipIconButton>
            </Box>
          ))}
        </Stack>
      </Stack>
    </Panel>
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
  ...SURFACES.wash,
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 1,
  p: 1,
};

const stepperGroupSx = {
  ...SURFACES.wash,
  px: 1,
  py: 0.5,
};

const stepperLabelSx = {
  mr: 0.75,
  ...TEXT_STYLES.label,
  color: 'text.primary',
};

