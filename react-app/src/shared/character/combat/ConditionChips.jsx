import { Box, Chip, Tooltip, Typography, alpha } from '@mui/material';
import { ChevronDown, X } from 'lucide-react';
import { EntryBlocks } from '../../content/EntryBlocks.jsx';
import { UI_COLORS, uiAlpha, OPACITY } from '../../ui/colors.js';
import { ASSIGNABLE_CONDITIONS } from './conditions.js';
import { asArray } from '../../lists.js';
import { FONT_SIZES } from '../../ui/fonts.js';
import { TEXT_STYLES } from '../../ui/textStyles.js';
import { ICON_SIZES } from '../../ui/iconSizes.js';

// The condition pill and its rules-text card, shared by the character sheet and
// the encounter builder. The two surfaces are meant to read identically — a GM
// applying Prone in a fight and a player reading it on their sheet should see
// the same thing — so they render the same components rather than two copies
// that drift apart.
//
// Only sizing differs between them, passed as `sx` / `fontSize`.

// The conditions accent, matching the theme's warning tone.
export const CONDITION_ACCENT = UI_COLORS.warning;
const CONDITION_BODY = UI_COLORS.textSecondary;

// Body click expands the rules text; the X removes the condition. The chevron
// advertises the expand affordance and rotates when open, so the two actions on
// one pill stay tellable apart.
export function ConditionPill({ label, hasDesc, isOpen, onToggle, onRemove, readOnlyReason, sx }) {
  const chip = (
    <Chip
      size="small"
      label={label}
      icon={hasDesc ? (
        <ChevronDown
          size={ICON_SIZES.xxs}
          style={{
            color: CONDITION_ACCENT,
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform .15s',
          }}
        />
      ) : undefined}
      onClick={hasDesc ? onToggle : undefined}
      onDelete={onRemove}
      deleteIcon={onRemove ? <X size={ICON_SIZES.xs} /> : undefined}
      sx={{
        cursor: hasDesc ? 'pointer' : 'default',
        color: CONDITION_ACCENT,
        borderColor: CONDITION_ACCENT,
        bgcolor: alpha(CONDITION_ACCENT, isOpen ? OPACITY.line : OPACITY.fill),
        boxShadow: isOpen ? `0 0 0 1px ${CONDITION_ACCENT}` : 'none',
        '&:hover': hasDesc ? { bgcolor: alpha(CONDITION_ACCENT, OPACITY.shade) } : undefined,
        ...(readOnlyReason ? { opacity: OPACITY.heavy } : null),
        ...sx,
      }}
    />
  );
  return readOnlyReason ? <Tooltip title={readOnlyReason}>{chip}</Tooltip> : chip;
}

// Accent-titled card over the XPHB description. EntryBlocks is tuned with accent
// effect names over warm body text so each effect reads distinctly.
export function ConditionCard({ label, entries, onClose, fontSize = FONT_SIZES.xs }) {
  return (
    <Box sx={cardSx}>
      <Box sx={cardHeaderSx}>
        <Typography sx={cardTitleSx}>{label}</Typography>
        <Box component="button" type="button" onClick={onClose} aria-label={`Close ${label}`} sx={cardCloseSx}>
          <X size={ICON_SIZES.xs} />
        </Box>
      </Box>
      <EntryBlocks
        entries={entries}
        spacing={0.5}
        fontSize={fontSize}
        headingColor={CONDITION_ACCENT}
        bodyColor={CONDITION_BODY}
        markerColor={CONDITION_ACCENT}
        emptyText={null}
      />
    </Box>
  );
}

const cardSx = {
  border: 2,
  borderColor: alpha(CONDITION_ACCENT, OPACITY.edge),
  borderRadius: 1,
  p: '6px 8px',
  bgcolor: alpha(CONDITION_ACCENT, OPACITY.wash),
};

const cardHeaderSx = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 };

const cardTitleSx = {
  ...TEXT_STYLES.title,
  fontSize: FONT_SIZES.xs,
  color: CONDITION_ACCENT,
};

const cardCloseSx = {
  display: 'inline-flex',
  p: 0.25,
  border: 0,
  bgcolor: 'transparent',
  cursor: 'pointer',
  color: 'text.secondary',
  borderRadius: 0.375,
  '&:hover': { color: CONDITION_ACCENT },
};

// The grid a condition is switched on and off from, the same on the sheet, in
// the encounter builder and in the map's piece menu: one chip per condition,
// an active one in the conditions accent. `sx` lays the grid out and `chipSx`
// sizes the chips for their surface.
export function ConditionToggleGrid({
  conditions = ASSIGNABLE_CONDITIONS, active, onToggle, disabled = false, sx, chipSx,
}) {
  return (
    <Box sx={sx}>
      {conditions.map((condition) => {
        const isOn = active.includes(condition.key);
        return (
          <Chip
            key={condition.key}
            size="small"
            label={condition.label}
            variant={isOn ? 'filled' : 'outlined'}
            disabled={disabled}
            onClick={disabled ? undefined : () => onToggle(condition.key)}
            sx={[
              toggleChipSx,
              isOn ? { color: CONDITION_ACCENT, borderColor: CONDITION_ACCENT, bgcolor: alpha(CONDITION_ACCENT, OPACITY.fill) } : null,
              { '&:hover': { boxShadow: `0 0 0 1px ${isOn ? CONDITION_ACCENT : uiAlpha(UI_COLORS.white, OPACITY.shade)}` } },
              ...asArray(chipSx),
            ]}
          />
        );
      })}
    </Box>
  );
}

const toggleChipSx = {
  cursor: 'pointer',
  justifyContent: 'flex-start',
};
