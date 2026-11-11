import { useState } from 'react';
import {
  Box,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { Minus, Plus, X } from 'lucide-react';
import { CUSTOM_CURRENCY_TONE, normalizeCoinAmount, sanitizeCoinInput } from './currency.js';
import IconColorPicker from '../../ui/IconColorPicker.jsx';
import { UI_COLORS, uiAlpha, OPACITY } from '../../ui/colors.js';
import { currencyVariant, HOVER_SUBTRACT, HOVER_ADD, buttonBaseSx } from './currencyVariants.js';
import { FONT_WEIGHTS, LINE_HEIGHTS } from '../../ui/fonts.js';

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
  const v = currencyVariant(mode);
  const amount = normalizeCoinAmount(value);
  const displayValue = focused ? draft : String(amount);
  const shortLabel = coin.shortLabel || coin.key.toUpperCase();
  const labelTop = coin.label || shortLabel;
  const labelBottom = `(${shortLabel})`;
  const addStep = normalizeCoinAmount(stepDraft) || 1;

  const labelBaseSx = {
    fontFamily: v.fontFamily,
    fontWeight: FONT_WEIGHTS.bold,
    lineHeight: LINE_HEIGHTS.tight,
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
        border: 2,
        borderColor: UI_COLORS.edge,
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
                border: '2px solid',
                borderColor: uiAlpha(UI_COLORS.white, OPACITY.strong),
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
            slotProps={{ htmlInput: { 'aria-label': 'Currency name', maxLength: 24 }, input: { disableUnderline: true } }}
          />
          <TextField
            value={coin.shortLabel}
            onChange={(event) => onShortLabelChange?.(event.target.value)}
            placeholder="ABBR"
            variant="standard"
            fullWidth
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
            slotProps={{ htmlInput: { 'aria-label': 'Currency abbreviation', maxLength: 5 }, input: { disableUnderline: true } }}
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
        sx={{
          '& input': {
            textAlign: 'center',
            fontFamily: v.fontFamily,
            fontSize: v.field.fontSize,
            fontWeight: FONT_WEIGHTS.bold,
            color: v.field.color,
            py: v.field.py,
          },
        }}
        slotProps={{ htmlInput: {
          inputMode: 'numeric',
          pattern: '[0-9]*',
          'aria-label': `${coin.label} amount`,
        } }}
      />
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: v.stepper.columns,
          overflow: 'hidden',
          mt: v.stepper.mt,
          border: 2,
          borderColor: UI_COLORS.edge,
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
              fontWeight: FONT_WEIGHTS.bold,
              color: v.stepper.stepColor,
              py: 0,
            },
          }}
          slotProps={{ htmlInput: {
            inputMode: 'numeric',
            pattern: '[0-9]*',
            'aria-label': `Custom ${coin.label} add amount`,
          }, input: { disableUnderline: true } }}
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

