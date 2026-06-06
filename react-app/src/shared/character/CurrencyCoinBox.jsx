import { useState } from 'react';
import { Box, IconButton, TextField, Tooltip, Typography, useMediaQuery } from '@mui/material';
import { Minus, Plus } from 'lucide-react';
import { CURRENCY_TYPES, normalizeCoinAmount, sanitizeCoinInput } from './currency.js';

// Accent colors shared across every variant.
const HOVER_SUBTRACT = '#de675f';
const HOVER_ADD = '#58b879';

const buttonBaseSx = {
  borderRadius: 0,
  '&.Mui-disabled': {
    opacity: 0.35,
  },
};

// Per-mode visual config. Add a new mode by adding an entry here — the JSX
// below reads from `v` and never branches on the mode name.
const VARIANTS = {
  builder: {
    fontFamily: undefined,
    box: { bgcolor: 'background.paper', p: 1 },
    labelGap: 0.6,
    labelTop: { fontSize: '0.66rem', letterSpacing: '0.04em' },
    labelBottom: { fontSize: '0.58rem', letterSpacing: '0.04em' },
    field: { variant: 'outlined', fontSize: '0.9rem', color: 'text.primary', py: '6px' },
    stepper: {
      columns: '24px minmax(34px, 1fr) 24px',
      mt: 0.5,
      bgcolor: 'background.default',
      button: 24,
      icon: 13,
      stepFontSize: '0.7rem',
      stepColor: 'text.secondary',
    },
  },
  sheet: {
    fontFamily: '"Cinzel", Georgia, serif',
    box: { bgcolor: 'rgba(35,32,26,1)', p: '4px 3px' },
    labelGap: 0.35,
    labelTop: { fontSize: '0.52rem', letterSpacing: '0.08em' },
    labelBottom: { fontSize: '0.48rem', letterSpacing: '0.08em' },
    field: { variant: 'standard', fontSize: '0.85rem', color: '#edd48a', py: '2px' },
    stepper: {
      columns: '20px minmax(26px, 1fr) 20px',
      mt: 0.3,
      bgcolor: '#12100e',
      button: 20,
      icon: 11,
      stepFontSize: '0.6rem',
      stepColor: '#edd48a',
    },
  },
};

export function CurrencyCoinBox({ coin, value, onChange, mode = 'builder' }) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState('');
  const [stepDraft, setStepDraft] = useState('');
  const v = VARIANTS[mode] ?? VARIANTS.builder;
  const amount = normalizeCoinAmount(value);
  const displayValue = focused ? draft : String(amount);
  const shortLabel = coin.shortLabel || coin.key.toUpperCase();
  const labelTop = coin.label || shortLabel;
  const labelBottom = `(${shortLabel})`;
  const addStep = normalizeCoinAmount(stepDraft) || 1;

  const labelBaseSx = {
    fontFamily: v.fontFamily,
    fontWeight: 700,
    lineHeight: 1.1,
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const stepButtonSx = {
    ...buttonBaseSx,
    width: v.stepper.button,
    height: v.stepper.button,
    color: 'text.secondary',
  };

  const commit = (nextValue) => {
    onChange?.(normalizeCoinAmount(nextValue));
  };

  const handleFocus = () => {
    setFocused(true);
    setDraft(amount > 0 ? String(amount) : '');
  };

  const handleChange = (event) => {
    const nextDraft = sanitizeCoinInput(event.target.value);
    setDraft(nextDraft);
    commit(nextDraft);
  };

  const handleStepChange = (event) => {
    setStepDraft(sanitizeCoinInput(event.target.value));
  };

  const handleBlur = () => {
    setFocused(false);
    setDraft('');
  };

  const step = (delta) => {
    const base = focused && draft !== '' ? normalizeCoinAmount(draft) : amount;
    const next = normalizeCoinAmount(base + delta);
    commit(next);
    if (focused) setDraft(next > 0 ? String(next) : '');
    setStepDraft('');
  };

  return (
    <Box
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: v.box.bgcolor,
        p: v.box.p,
        textAlign: 'center',
      }}
    >
      <Box sx={{ mb: v.labelGap }}>
        <Typography sx={{ ...labelBaseSx, color: coin.tone, ...v.labelTop }}>
          {labelTop}
        </Typography>
        <Typography sx={{ ...labelBaseSx, color: 'text.secondary', ...v.labelBottom }}>
          {labelBottom}
        </Typography>
      </Box>
      <TextField
        fullWidth
        size="small"
        variant={v.field.variant}
        value={displayValue}
        onFocus={handleFocus}
        onChange={handleChange}
        onBlur={handleBlur}
        inputProps={{
          inputMode: 'numeric',
          pattern: '[0-9]*',
          'aria-label': `${coin.label} amount`,
        }}
        sx={{
          '& input': {
            textAlign: 'center',
            fontFamily: v.fontFamily,
            fontSize: v.field.fontSize,
            fontWeight: 700,
            color: v.field.color,
            py: v.field.py,
          },
        }}
      />
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: v.stepper.columns,
          overflow: 'hidden',
          mt: v.stepper.mt,
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          bgcolor: v.stepper.bgcolor,
        }}
      >
        <Tooltip title={`Subtract ${addStep}`}>
          <span>
            <IconButton
              size="small"
              disabled={amount <= 0 && (!focused || draft === '')}
              onClick={() => step(-addStep)}
              sx={{ ...stepButtonSx, '&:hover': { color: HOVER_SUBTRACT } }}
            >
              <Minus size={v.stepper.icon} />
            </IconButton>
          </span>
        </Tooltip>
        <TextField
          value={stepDraft}
          onChange={handleStepChange}
          placeholder="1"
          size="small"
          variant="standard"
          fullWidth
          inputProps={{
            inputMode: 'numeric',
            pattern: '[0-9]*',
            'aria-label': `Custom ${coin.label} add amount`,
          }}
          InputProps={{ disableUnderline: true }}
          sx={{
            '& .MuiInputBase-root': {
              height: v.stepper.button,
              borderLeft: 1,
              borderColor: 'divider',
            },
            '& input': {
              textAlign: 'center',
              fontFamily: v.fontFamily,
              fontSize: v.stepper.stepFontSize,
              fontWeight: 700,
              color: v.stepper.stepColor,
              py: 0,
            },
          }}
        />
        <Tooltip title={`Add ${addStep}`}>
          <IconButton
            size="small"
            onClick={() => step(addStep)}
            sx={{
              ...stepButtonSx,
              borderLeft: 1,
              borderColor: 'divider',
              '&:hover': { color: HOVER_ADD },
            }}
          >
            <Plus size={v.stepper.icon} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}

// Per-mode row layout. `basis` is each coin's preferred width.
const ROW_LAYOUT = {
  builder: { gap: 1, basis: 108 },
  sheet: { gap: 0.75, basis: 96 },
};

// Desktop (>= sm): coins flex to fill the row. Mobile (< sm): coins keep their
// `basis` width on a horizontally scrollable row so they stay legible.
// useMediaQuery (matchMedia) is used instead of an sx `{ xs, sm }` object
// because the `flex` shorthand does not reliably emit per-breakpoint values.
export function CurrencyRow({ currency, onCoinChange, mode = 'builder', sx }) {
  const { gap, basis } = ROW_LAYOUT[mode] ?? ROW_LAYOUT.builder;
  const compact = useMediaQuery((theme) => theme.breakpoints.down('sm'), { noSsr: true });

  return (
    <Box sx={{ overflowX: 'auto', pb: compact ? 0.25 : 0, ...sx }}>
      <Box sx={{ display: 'flex', gap, width: compact ? 'max-content' : 'auto' }}>
        {CURRENCY_TYPES.map((coin) => (
          <Box key={coin.key} sx={{ flex: compact ? `0 0 ${basis}px` : 1, minWidth: 0 }}>
            <CurrencyCoinBox
              coin={coin}
              mode={mode}
              value={currency?.[coin.key]}
              onChange={(value) => onCoinChange(coin.key, value)}
            />
          </Box>
        ))}
      </Box>
    </Box>
  );
}
