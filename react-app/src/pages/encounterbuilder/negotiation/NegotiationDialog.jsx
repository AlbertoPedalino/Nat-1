import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import { Check, Handshake, X } from 'lucide-react';
import SheetDialog, { DialogSection, ResetButton } from '../../../shared/ui/SheetDialog.jsx';
import {
  getNpcAttitude,
  MAX_INTEREST,
  MAX_THRESHOLD,
  MIN_THRESHOLD,
  NEGOTIATION_ACTIONS,
  NEGOTIATION_RESULTS,
  negotiationStatus,
  NPC_ATTITUDES,
} from './negotiation.js';
import { encounterPanel } from '../state/EncounterBuilderContext.jsx';
import { UI_COLORS, uiAlpha, OPACITY } from '../../../shared/ui/colors.js';
import { UI_FONTS, FONT_SIZES, FONT_WEIGHTS, LINE_HEIGHTS } from '../../../shared/ui/fonts.js';
import { confirmAction } from '../../../shared/ui/confirmAction.js';
import { signed } from '../../../shared/ui/numberFormat.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import Caption from '../../../shared/ui/Caption.jsx';
import { SURFACES, calloutSx, meterTrackSx, tintedSurfaceSx } from '../../../shared/ui/surfaces.js';
import { GAME_ICONS } from '../../../shared/ui/gameIcons.js';

const ACTION_UI = Object.freeze([
  { id: 'passed', Icon: Check, color: 'success' },
  { id: 'failed', Icon: X, color: 'warning' },
  { id: 'criticalSuccess', Icon: GAME_ICONS.criticalSuccess, color: 'primary' },
  { id: 'criticalFailure', Icon: GAME_ICONS.criticalFailure, color: 'error' },
]);

export default encounterPanel({ state: ['negotiation'], context: ['dispatch'] }, NegotiationDialogView);

function NegotiationDialogView({ open, onClose, state, dispatch }) {
  const negotiation = state.negotiation;
  const attitude = getNpcAttitude(negotiation.attitude);
  const status = negotiationStatus(negotiation);

  const setAttitude = (attitudeId) => {
    if (attitudeId === negotiation.attitude) return;
    dispatch({ type: 'setNegotiationAttitude', attitude: attitudeId });
  };

  const resolve = (outcome) => {
    dispatch({ type: 'resolveNegotiation', outcome });
  };

  const reset = () => {
    if (!confirmAction('Reset this negotiation?')) return;
    dispatch({ type: 'resetNegotiation' });
  };

  return (
    <SheetDialog
      open={open}
      onClose={onClose}
      title="Negotiation"
      icon={<Handshake size={ICON_SIZES.xl} />}
      showClose
      maxWidth="sm"
      phoneFullScreen
      topPad={1.5}
      actions={<ResetButton onClick={reset}>Reset negotiation</ResetButton>}
    >
      <Stack spacing={1.75}>
        <DialogSection
          title="NPC attitude"
          hint="Changing attitude resets Patience and Interest. The threshold is preserved."
        >
          <Box sx={attitudeGridSx}>
            {NPC_ATTITUDES.map((item) => {
              const selected = item.id === negotiation.attitude;
              return (
                <Button
                  key={item.id}
                  variant={selected ? 'contained' : 'outlined'}
                  color={selected ? attitudeColor(item.id) : 'inherit'}
                  onClick={() => setAttitude(item.id)}
                  sx={attitudeButtonSx}
                >
                  <span>{item.label}</span>
                  <small>P {item.patience} · I {item.interest}</small>
                </Button>
              );
            })}
          </Box>
        </DialogSection>

        <TextField
          label="Threshold / DC"
          type="number"
          value={negotiation.threshold ?? ''}
          onChange={(event) => dispatch({ type: 'setNegotiationThreshold', value: event.target.value })}
          placeholder="Set the threshold"
          size="small"
          fullWidth
          helperText="The roll is made separately; record its outcome using the buttons below."
          slotProps={{ htmlInput: { min: MIN_THRESHOLD, max: MAX_THRESHOLD, inputMode: 'numeric' } }}
        />

        <Box sx={meterGridSx}>
          <MeterCard
            label="Interest"
            value={negotiation.interest}
            max={MAX_INTEREST}
            color={UI_COLORS.secondary}
            prominent
          />
          <MeterCard
            label="Patience"
            value={negotiation.patience}
            max={attitude.patience}
            color={UI_COLORS.accent}
          />
        </Box>

        {status.ended ? (
          <Box sx={finalResultSx}>
            <Typography sx={finalEyebrowSx}>Negotiation concluded</Typography>
            <Typography sx={finalResultTextSx}>{status.result}</Typography>
            <Caption>{status.reason}</Caption>
          </Box>
        ) : (
          <Box sx={currentStateSx}>
            <Caption>Current position</Caption>
            <Typography sx={currentResultSx}>
              Interest {negotiation.interest}: {NEGOTIATION_RESULTS[negotiation.interest]}
            </Typography>
          </Box>
        )}

        <DialogSection title="Resolve the check">
          <Box sx={actionGridSx}>
            {ACTION_UI.map(({ id, Icon, color }) => {
              const action = NEGOTIATION_ACTIONS[id];
              return (
                <Button
                  key={id}
                  variant="outlined"
                  color={color}
                  disabled={status.ended}
                  onClick={() => resolve(id)}
                  sx={actionButtonSx}
                >
                  <Icon size={ICON_SIZES.lg} />
                  <span>{action.label}</span>
                  <small>{formatActionDelta(action)}</small>
                </Button>
              );
            })}
          </Box>
        </DialogSection>
      </Stack>
    </SheetDialog>
  );
}

function MeterCard({ label, value, max, color, prominent = false }) {
  return (
    <Box sx={{ ...meterCardSx, ...(prominent ? prominentMeterSx : {}) }}>
      <Stack direction="row" sx={{ alignItems: 'baseline', justifyContent: 'space-between', gap: 1 }}>
        <Typography sx={meterLabelSx}>{label}</Typography>
        <Typography sx={{ ...meterValueSx, color }}>
          {value}<Box component="span" sx={meterMaxSx}>/{max}</Box>
        </Typography>
      </Stack>
      <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${max}, 1fr)`, gap: 0.5, mt: 0.75 }}>
        {Array.from({ length: max }, (_, index) => (
          <Box
            key={index}
            sx={{ ...meterTrackSx(prominent ? 9 : 7), ...(index < value ? { bgcolor: color } : null) }}
          />
        ))}
      </Box>
    </Box>
  );
}

function attitudeColor(attitudeId) {
  if (attitudeId === 'hostile') return 'error';
  if (attitudeId === 'friendly') return 'success';
  return 'primary';
}

function formatActionDelta(action) {
  return [
    action.interestDelta ? `Interest ${signed(action.interestDelta)}` : '',
    action.patienceDelta ? `Patience ${signed(action.patienceDelta)}` : '',
  ].filter(Boolean).join(' · ');
}

const attitudeGridSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
  gap: 0.75,
  mt: 1,
};

const attitudeButtonSx = {
  minHeight: { xs: 46, sm: 58 },
  display: 'flex',
  flexDirection: { xs: 'row', sm: 'column' },
  justifyContent: 'center',
  gap: { xs: 1, sm: 0.25 },
  fontSize: FONT_SIZES.sm,
  '& small': {
    fontFamily: UI_FONTS.mono,
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    opacity: OPACITY.veil,
  },
};

const meterGridSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
  gap: 1,
};

const meterCardSx = {
  ...SURFACES.wash,
  p: 1.25,
};

const prominentMeterSx = {
  borderColor: uiAlpha(UI_COLORS.secondary, OPACITY.edge),
  ...tintedSurfaceSx(UI_COLORS.secondary, { amount: OPACITY.wash }),
};

const meterLabelSx = {
  ...TEXT_STYLES.label,
  fontSize: FONT_SIZES.sm,
  
};

const meterValueSx = {
  ...TEXT_STYLES.figure,
  fontSize: FONT_SIZES.heading,
  lineHeight: LINE_HEIGHTS.none,
};

const meterMaxSx = {
  ml: 0.25,
  fontSize: FONT_SIZES.md,
  color: 'text.secondary',
};

const currentStateSx = {
  ...SURFACES.wash,
  p: 1,
};

const currentResultSx = {
  mt: 0.25,
  fontSize: FONT_SIZES.xxl,
  fontWeight: FONT_WEIGHTS.bold,
  lineHeight: LINE_HEIGHTS.normal,
};

const finalResultSx = {
  ...calloutSx(UI_COLORS.accent),
  p: { xs: 1.25, sm: 1.5 },
};

const finalEyebrowSx = {
  ...TEXT_STYLES.label,
  fontSize: FONT_SIZES.xs,
  color: 'primary.main',
};

const finalResultTextSx = {
  my: 0.25,
  ...TEXT_STYLES.figure,
  fontSize: { xs: FONT_SIZES.body, sm: FONT_SIZES.lead },
  lineHeight: LINE_HEIGHTS.normal,
};

const actionGridSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr' },
  gap: 0.75,
  mt: 1,
};

const actionButtonSx = {
  minHeight: { xs: 84, sm: 78 },
  px: { xs: 0.75, sm: 1 },
  py: 0.75,
  display: 'flex',
  flexDirection: 'column',
  gap: 0.25,
  ...TEXT_STYLES.figure,
  fontSize: { xs: FONT_SIZES.xs, sm: FONT_SIZES.sm },
  lineHeight: LINE_HEIGHTS.snug,
  '& small': {
    fontFamily: UI_FONTS.mono,
    fontSize: { xs: FONT_SIZES.xxs, sm: FONT_SIZES.xxs },
    fontWeight: FONT_WEIGHTS.bold,
    opacity: OPACITY.heavy,
    lineHeight: LINE_HEIGHTS.snug,
  },
};
