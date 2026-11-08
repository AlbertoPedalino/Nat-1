import {
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
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
import { UI_COLORS, uiAlpha } from '../../../shared/ui/colors.js';
import { UI_FONTS } from '../../../shared/ui/fonts.js';
import { confirmAction } from '../../../shared/ui/confirmAction.js';
import { signed } from '../../../shared/ui/numberFormat.js';

const ACTION_UI = Object.freeze([
  { id: 'passed', Icon: Check, color: 'success' },
  { id: 'failed', Icon: X, color: 'warning' },
  { id: 'criticalSuccess', Icon: Sparkles, color: 'primary' },
  { id: 'criticalFailure', Icon: Skull, color: 'error' },
]);

export default function NegotiationDialog({ open, onClose }) {
  const { state, dispatch } = useEncounterBuilder();
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('sm'));
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
      icon={<Handshake size={20} />}
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
            color={UI_COLORS.teal}
            prominent
          />
          <MeterCard
            label="Patience"
            value={negotiation.patience}
            max={attitude.patience}
            color={UI_COLORS.goldAmber}
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
                  <Icon size={18} />
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
      <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${max}, 1fr)`, gap: 0.45, mt: 0.85 }}>
        {Array.from({ length: max }, (_, index) => (
          <Box
            key={index}
            sx={{
              height: prominent ? 9 : 7,
              borderRadius: 99,
              bgcolor: index < value ? color : uiAlpha(UI_COLORS.white, 0.09),
              boxShadow: index < value ? `0 0 8px ${color}55` : 'none',
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
  gap: 0.65,
  mt: 1,
};

const attitudeButtonSx = {
  minHeight: { xs: 46, sm: 58 },
  display: 'flex',
  flexDirection: { xs: 'row', sm: 'column' },
  justifyContent: 'center',
  gap: { xs: 1, sm: 0.15 },
  fontFamily: UI_FONTS.display,
  fontSize: '0.68rem',
  fontWeight: 800,
  letterSpacing: '0.05em',
  '& small': {
    fontFamily: UI_FONTS.mono,
    fontSize: '0.62rem',
    fontWeight: 600,
    opacity: 0.8,
  },
};

const meterGridSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
  gap: 1,
};

const meterCardSx = {
  p: 1.25,
  bgcolor: uiAlpha(UI_COLORS.white, 0.02),
};

const prominentMeterSx = {
  borderColor: uiAlpha(UI_COLORS.teal, 0.45),
  bgcolor: uiAlpha(UI_COLORS.teal, 0.055),
};

const meterLabelSx = {
  fontFamily: UI_FONTS.display,
  fontSize: '0.69rem',
  fontWeight: 800,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
};

const meterValueSx = {
  fontFamily: UI_FONTS.display,
  fontSize: '1.55rem',
  fontWeight: 900,
  lineHeight: 1,
};

const meterMaxSx = {
  ml: 0.2,
  fontSize: '0.72rem',
  color: 'text.secondary',
};

const currentStateSx = {
  p: 1.1,
  bgcolor: uiAlpha(UI_COLORS.white, 0.018),
};

const currentResultSx = {
  mt: 0.2,
  fontSize: '0.86rem',
  fontWeight: 700,
  lineHeight: 1.35,
};

const finalResultSx = {
  p: { xs: 1.25, sm: 1.5 },
  border: 1,
  borderColor: 'primary.main',
  bgcolor: uiAlpha(UI_COLORS.goldAmber, 0.08),
};

const finalEyebrowSx = {
  fontFamily: UI_FONTS.display,
  fontSize: '0.62rem',
  fontWeight: 800,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'primary.main',
};

const finalResultTextSx = {
  my: 0.35,
  fontFamily: UI_FONTS.display,
  fontSize: { xs: '1rem', sm: '1.1rem' },
  fontWeight: 800,
  lineHeight: 1.35,
};

const actionGridSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr' },
  gap: 0.75,
  mt: 1,
};

const actionButtonSx = {
  minHeight: { xs: 84, sm: 78 },
  px: { xs: 0.65, sm: 1 },
  py: 0.8,
  display: 'flex',
  flexDirection: 'column',
  gap: 0.25,
  fontFamily: UI_FONTS.display,
  fontSize: { xs: '0.61rem', sm: '0.66rem' },
  fontWeight: 800,
  lineHeight: 1.25,
  '& small': {
    fontFamily: UI_FONTS.mono,
    fontSize: { xs: '0.54rem', sm: '0.58rem' },
    fontWeight: 600,
    opacity: 0.75,
    lineHeight: 1.25,
  },
};
