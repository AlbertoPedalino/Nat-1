import { useState } from 'react';
import { Box, IconButton, TextField, Tooltip, Typography, useMediaQuery } from '@mui/material';
import { ChevronLeft, ChevronRight, Minus, Plus, X } from 'lucide-react';
import {
  CUSTOM_CURRENCY_TONE,
  orderedCurrencyEntries,
  normalizeCoinAmount,
  sanitizeCoinInput,
} from './currency.js';
import IconColorPicker from './IconColorPicker.jsx';

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

export function CurrencyCoinBox({
  coin,
  value,
  onChange,
  mode = 'builder',
  editable = false,
  onLabelChange,
  onShortLabelChange,
  onToneChange,
  onRemove,
}) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState('');
  const [stepDraft, setStepDraft] = useState('');
  const [colorAnchor, setColorAnchor] = useState(null);
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
        position: 'relative',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: v.box.bgcolor,
        p: v.box.p,
        textAlign: 'center',
      }}
    >
      {editable ? (
        <Box sx={{ mb: v.labelGap }}>
          <Tooltip title="Currency color">
            <Box
              role="button"
              aria-label="Currency color"
              onClick={(event) => setColorAnchor(event.currentTarget)}
              sx={{
                position: 'absolute',
                top: 4,
                left: 4,
                width: 14,
                height: 14,
                borderRadius: '50%',
                bgcolor: coin.tone,
                border: '1px solid',
                borderColor: 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                zIndex: 1,
                transition: 'transform 0.12s',
                '&:hover': { transform: 'scale(1.18)' },
              }}
            />
          </Tooltip>
          <Tooltip title="Remove currency">
            <IconButton
              size="small"
              onClick={() => onRemove?.()}
              aria-label="Remove currency"
              sx={{
                position: 'absolute',
                top: 1,
                right: 1,
                p: 0.25,
                color: 'text.secondary',
                '&:hover': { color: HOVER_SUBTRACT },
                zIndex: 1,
              }}
            >
              <X size={v.stepper.icon} />
            </IconButton>
          </Tooltip>
          <TextField
            value={coin.label}
            onChange={(event) => onLabelChange?.(event.target.value)}
            placeholder="Name"
            variant="standard"
            fullWidth
            inputProps={{ 'aria-label': 'Currency name', maxLength: 24 }}
            InputProps={{ disableUnderline: true }}
            sx={{
              '& input': {
                ...labelBaseSx,
                ...v.labelTop,
                color: coin.tone,
                textAlign: 'center',
                px: 2,
                py: 0,
              },
            }}
          />
          <TextField
            value={coin.shortLabel}
            onChange={(event) => onShortLabelChange?.(event.target.value)}
            placeholder="ABBR"
            variant="standard"
            fullWidth
            inputProps={{ 'aria-label': 'Currency abbreviation', maxLength: 5 }}
            InputProps={{ disableUnderline: true }}
            sx={{
              '& input': {
                ...labelBaseSx,
                ...v.labelBottom,
                color: 'text.secondary',
                textAlign: 'center',
                px: 0,
                py: 0,
              },
            }}
          />
          <IconColorPicker
            anchorEl={colorAnchor}
            onClose={() => setColorAnchor(null)}
            currentColor={coin.tone}
            onSelect={(color) => onToneChange?.(color || CUSTOM_CURRENCY_TONE)}
            title="Currency Color"
          />
        </Box>
      ) : (
        <Box sx={{ mb: v.labelGap }}>
          <Typography sx={{ ...labelBaseSx, color: coin.tone, ...v.labelTop }}>
            {labelTop}
          </Typography>
          <Typography sx={{ ...labelBaseSx, color: 'text.secondary', ...v.labelBottom }}>
            {labelBottom}
          </Typography>
        </Box>
      )}
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

// Move-left / move-right controls shown under each currency when reordering is
// enabled (builder). Applies to coins and custom entries alike.
function ReorderBar({ canLeft, canRight, onLeft, onRight, mode = 'builder' }) {
  const v = VARIANTS[mode] ?? VARIANTS.builder;
  const btnSx = {
    p: 0.25,
    borderRadius: 0,
    color: 'text.secondary',
    '&.Mui-disabled': { opacity: 0.3 },
    '&:hover': { color: 'text.primary' },
  };
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        mt: v.stepper.mt,
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: v.stepper.bgcolor,
      }}
    >
      <Tooltip title="Move left">
        <span>
          <IconButton size="small" disabled={!canLeft} onClick={onLeft} aria-label="Move currency left" sx={btnSx}>
            <ChevronLeft size={v.stepper.icon} />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Move right">
        <span>
          <IconButton size="small" disabled={!canRight} onClick={onRight} aria-label="Move currency right" sx={btnSx}>
            <ChevronRight size={v.stepper.icon} />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
}

// Dashed "+" tile that appends a new custom currency entry.
function AddCurrencyTile({ onClick, mode = 'builder' }) {
  const v = VARIANTS[mode] ?? VARIANTS.builder;
  return (
    <Box
      role="button"
      tabIndex={0}
      aria-label="Add custom currency"
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick?.();
        }
      }}
      sx={{
        height: '100%',
        minHeight: 92,
        border: '1px dashed',
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: v.box.bgcolor,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.5,
        cursor: 'pointer',
        color: 'text.secondary',
        transition: 'color 120ms, border-color 120ms',
        '&:hover, &:focus-visible': { color: HOVER_ADD, borderColor: HOVER_ADD },
      }}
    >
      <Plus size={18} />
      <Typography
        sx={{
          fontFamily: v.fontFamily,
          fontSize: '0.6rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          lineHeight: 1.1,
        }}
      >
        Custom
      </Typography>
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
export function CurrencyRow({
  currency,
  onCoinChange,
  onCustomAmountChange,
  onCustomMetaChange,
  onCustomRemove,
  onCustomAdd,
  onReorder,
  mode = 'builder',
  sx,
}) {
  const { gap, basis } = ROW_LAYOUT[mode] ?? ROW_LAYOUT.builder;
  const compact = useMediaQuery((theme) => theme.breakpoints.down('sm'), { noSsr: true });
  const entries = orderedCurrencyEntries(currency);
  // Labels are editable only when the parent wires up metadata/remove handlers
  // (builder). The sheet passes amount-only handlers, so labels stay read-only.
  const editableCustom = Boolean(onCustomMetaChange || onCustomRemove);
  const cellSx = { flex: compact ? '0 0 auto' : 1, width: compact ? basis : 'auto', minWidth: 0 };

  return (
    <Box sx={{ overflowX: 'auto', overflowY: 'hidden', overscrollBehaviorX: 'none', pb: compact ? 0.25 : 0, ...sx }}>
      <Box sx={{ display: 'flex', gap, width: compact ? 'max-content' : 'auto' }}>
        {entries.map((item, idx) => (
          <Box key={item.key} sx={cellSx}>
            {item.kind === 'coin' ? (
              <CurrencyCoinBox
                coin={item.coin}
                mode={mode}
                value={item.amount}
                onChange={(value) => onCoinChange?.(item.coin.key, value)}
              />
            ) : (
              <CurrencyCoinBox
                mode={mode}
                coin={{ key: item.entry.id, label: item.entry.label, shortLabel: item.entry.shortLabel, tone: item.entry.tone || CUSTOM_CURRENCY_TONE }}
                value={item.entry.amount}
                onChange={(value) => onCustomAmountChange?.(item.entry.id, value)}
                editable={editableCustom}
                onLabelChange={(text) => onCustomMetaChange?.(item.entry.id, { label: text })}
                onShortLabelChange={(text) => onCustomMetaChange?.(item.entry.id, { shortLabel: text })}
                onToneChange={(tone) => onCustomMetaChange?.(item.entry.id, { tone })}
                onRemove={() => onCustomRemove?.(item.entry.id)}
              />
            )}
            {onReorder ? (
              <ReorderBar
                mode={mode}
                canLeft={idx > 0}
                canRight={idx < entries.length - 1}
                onLeft={() => onReorder(item.key, -1)}
                onRight={() => onReorder(item.key, 1)}
              />
            ) : null}
          </Box>
        ))}
        {onCustomAdd ? (
          <Box sx={cellSx}>
            <AddCurrencyTile mode={mode} onClick={() => onCustomAdd()} />
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}
