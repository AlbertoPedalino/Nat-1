import { Box, Chip, Tooltip, Typography } from '@mui/material';
import { ChevronDown, X } from 'lucide-react';
import { EntryBlocks } from '../../content/EntryBlocks.jsx';
import { UI_COLORS } from '../../ui/colors.js';
import { ASSIGNABLE_CONDITIONS } from './conditions.js';
import { FONT_SIZES } from '../../ui/fonts.js';
import { ICON_SIZES } from '../../ui/iconSizes.js';
import { markerDensitySx, markerOfferedSx, markerOnSx } from './markerChipStyles.js';
import MarkerChip from './MarkerChip.jsx';
import { TEXT_STYLES } from '../../ui/textStyles.js';
import { BARE_BUTTON_SX } from '../../ui/interactive.js';
import { calloutSx } from '../../ui/surfaces.js';

// The condition pill and its rules-text card, shared by the character sheet and
// the encounter builder. The two surfaces are meant to read identically — a GM
// applying Prone in a fight and a player reading it on their sheet should see
// the same thing — so they render the same components rather than two copies
// that drift apart.
//
// Only sizing differs between them, passed as `density` / `fontSize`.

// The conditions accent, matching the theme's warning tone.
export const CONDITION_ACCENT = UI_COLORS.warning;
const CONDITION_BODY = UI_COLORS.textSecondary;

// Body click expands the rules text; the X removes the condition. The chevron
// advertises the expand affordance and rotates when open, so the two actions on
// one pill stay tellable apart. Its look is the marker's (markerChipStyles.js);
// `density` sizes it for its surface.
export function ConditionPill({ label, hasDesc, isOpen, onToggle, onRemove, readOnlyReason, density }) {
  const chip = (
    <MarkerChip
      label={label}
      accent={CONDITION_ACCENT}
      open={isOpen}
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
      onRemove={onRemove}
      removeLabel={`Remove ${label}`}
      dimmed={Boolean(readOnlyReason)}
      density={density}
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
        <Typography sx={conditionTitleSx}>{label}</Typography>
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
        emptyText={null}
      />
    </Box>
  );
}

const cardSx = {
  ...calloutSx(CONDITION_ACCENT),
  py: 0.75,
  px: 1,
};

const cardHeaderSx = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 };

const conditionTitleSx = {
  ...TEXT_STYLES.cardName,
  fontSize: FONT_SIZES.xs,
  color: CONDITION_ACCENT,
};

const cardCloseSx = {
  ...BARE_BUTTON_SX,
  display: 'inline-flex',
  p: 0.25,
  bgcolor: 'transparent',
  color: 'text.secondary',
  borderRadius: 0.375,
  '&:hover': { color: CONDITION_ACCENT },
};

// The grid a condition is switched on and off from, the same on the sheet, in
// the encounter builder and in the map's piece menu: one chip per condition,
// an active one drawn as the marker it is, an inactive one offered
// (markerChipStyles.js). `sx` lays the grid out and `density` sizes the chips
// for their surface.
export function ConditionToggleGrid({
  conditions = ASSIGNABLE_CONDITIONS, active, onToggle, disabled = false, sx, density,
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
            disabled={disabled}
            onClick={disabled ? undefined : () => onToggle(condition.key)}
            sx={[
              toggleChipSx,
              isOn ? markerOnSx(CONDITION_ACCENT) : markerOfferedSx(CONDITION_ACCENT),
              markerDensitySx(density),
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
