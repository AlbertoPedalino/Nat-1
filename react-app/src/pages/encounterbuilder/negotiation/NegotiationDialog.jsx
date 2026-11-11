import { Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { Check, Handshake, Skull, Sparkles, X } from 'lucide-react';
import SheetDialog, { dialogSectionTitleSx } from '../../../shared/ui/SheetDialog.jsx';
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
import { useEncounterBuilder } from '../state/EncounterBuilderContext.jsx';
import { UI_COLORS, uiAlpha, OPACITY } from '../../../shared/ui/colors.js';
import { UI_FONTS, FONT_SIZES, FONT_WEIGHTS, LINE_HEIGHTS } from '../../../shared/ui/fonts.js';
import { confirmAction } from '../../../shared/ui/confirmAction.js';
import { signed } from '../../../shared/ui/numberFormat.js';
import { useIsPhone } from '../../../shared/ui/useIsPhone.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';

const ACTION_UI = Object.freeze([
  { id: 'passed', Icon: Check, color: 'success' },
  { id: 'failed', Icon: X, color: 'warning' },
  { id: 'criticalSuccess', Icon: Sparkles, color: 'primary' },
  { id: 'criticalFailure', Icon: Skull, color: 'error' },
]);

export default function NegotiationDialog({ open, onClose }) {
  const { state, dispatch } = useEncounterBuilder();
  const mobile = useIsPhone();
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
      fullScreen={mobile}
      topPad={1.5}
      contentSx={contentSx}
      actions={(
        <Button
          onClick={reset}
          color="inherit"
          size="small"
          sx={{ mr: 'auto' }}
        >
          Reset negotiation
        </Button>
      )}
    >
      <Stack spacing={1.75}>
        <Box>
          <Typography sx={dialogSectionTitleSx}>NPC attitude</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Changing attitude resets Patience and Interest. The threshold is preserved.
          </Typography>
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
        </Box>

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
          <Paper sx={finalResultSx}>
            <Typography sx={finalEyebrowSx}>Negotiation concluded</Typography>
            <Typography sx={finalResultTextSx}>{status.result}</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>{status.reason}</Typography>
          </Paper>
        ) : (
          <Paper variant="outlined" sx={currentStateSx}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>Current position</Typography>
            <Typography sx={currentResultSx}>
              Interest {negotiation.interest}: {NEGOTIATION_RESULTS[negotiation.interest]}
            </Typography>
          </Paper>
        )}

        <Box>
          <Typography sx={dialogSectionTitleSx}>Resolve the check</Typography>
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
        </Box>
      </Stack>
    </SheetDialog>
  );
}

function MeterCard({ label, value, max, color, prominent = false }) {
  return (
    <Paper variant="outlined" sx={{ ...meterCardSx, ...(prominent ? prominentMeterSx : {}) }}>
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
            sx={{
              height: prominent ? 9 : 7,
              borderRadius: 99,
              bgcolor: index < value ? color : uiAlpha(UI_COLORS.white, OPACITY.soft),
              boxShadow: index < value ? `0 0 8px ${uiAlpha(color, OPACITY.line)}` : 'none',
            }}
          />
        ))}
      </Box>
    </Paper>
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

const contentSx = {
  px: { xs: 1.25, sm: 2.25 },
  pb: { xs: 1.5, sm: 2 },
};

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
  ...TEXT_STYLES.title,
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
  p: 1.25,
  bgcolor: uiAlpha(UI_COLORS.white, OPACITY.faint),
};

const prominentMeterSx = {
  borderColor: uiAlpha(UI_COLORS.secondary, OPACITY.edge),
  bgcolor: uiAlpha(UI_COLORS.secondary, OPACITY.wash),
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
  p: 1,
  bgcolor: uiAlpha(UI_COLORS.white, OPACITY.faint),
};

const currentResultSx = {
  mt: 0.25,
  fontSize: FONT_SIZES.xxl,
  fontWeight: FONT_WEIGHTS.bold,
  lineHeight: LINE_HEIGHTS.normal,
};

const finalResultSx = {
  p: { xs: 1.25, sm: 1.5 },
  border: 2,
  borderColor: 'primary.main',
  bgcolor: uiAlpha(UI_COLORS.accent, OPACITY.soft),
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
