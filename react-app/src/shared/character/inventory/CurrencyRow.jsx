import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { CUSTOM_CURRENCY_TONE, orderedCurrencyEntries } from './currency.js';
import { CurrencyCoinBox } from './CurrencyCoinBox.jsx';
import { currencyVariant, HOVER_ADD } from './currencyVariants.js';
import { useIsPhone } from '../../ui/useIsPhone.js';
import { FONT_SIZES, LETTER_SPACINGS } from '../../ui/fonts.js';

// Move-left / move-right controls shown under each currency when reordering is
// enabled (builder). Applies to coins and custom entries alike.
export function ReorderBar({ canLeft, canRight, onLeft, onRight, mode = 'builder' }) {
  const v = currencyVariant(mode);
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
export function AddCurrencyTile({ onClick, mode = 'builder' }) {
  const v = currencyVariant(mode);
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
          fontSize: FONT_SIZES.xs,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: LETTER_SPACINGS.sm,
          lineHeight: 1.1,
        }}
      >
        Custom
      </Typography>
    </Box>
  );
}

// Per-mode row layout. `basis` is each coin's preferred width.
export const ROW_LAYOUT = {
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
  const compact = useIsPhone();
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
