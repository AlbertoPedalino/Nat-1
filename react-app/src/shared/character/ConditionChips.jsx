import { Box, Chip, Tooltip, Typography, alpha } from '@mui/material';
import { ChevronDown, X } from 'lucide-react';
import { EntryBlocks } from './EntryBlocks.jsx';

// The condition pill and its rules-text card, shared by the character sheet and
// the encounter builder. The two surfaces are meant to read identically — a GM
// applying Prone in a fight and a player reading it on their sheet should see
// the same thing — so they render the same components rather than two copies
// that drift apart.
//
// Only sizing differs between them, passed as `sx` / `fontSize`.

// The conditions accent, matching the theme's warning tone.
export const CONDITION_ACCENT = '#d69245';
const CONDITION_BODY = '#cabd9f';

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
          size={11}
          style={{
            color: CONDITION_ACCENT,
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform .15s',
          }}
        />
      ) : undefined}
      onClick={hasDesc ? onToggle : undefined}
      onDelete={onRemove}
      deleteIcon={onRemove ? <X size={12} /> : undefined}
      sx={{
        cursor: hasDesc ? 'pointer' : 'default',
        color: CONDITION_ACCENT,
        borderColor: CONDITION_ACCENT,
        bgcolor: alpha(CONDITION_ACCENT, isOpen ? 0.3 : 0.14),
        boxShadow: isOpen ? `0 0 0 1px ${CONDITION_ACCENT}` : 'none',
        '&:hover': hasDesc ? { bgcolor: alpha(CONDITION_ACCENT, 0.24) } : undefined,
        ...(readOnlyReason ? { opacity: 0.75 } : null),
        ...sx,
      }}
    />
  );
  return readOnlyReason ? <Tooltip title={readOnlyReason}>{chip}</Tooltip> : chip;
}

// Accent-titled card over the XPHB description. EntryBlocks is tuned with accent
// effect names over warm body text so each effect reads distinctly.
export function ConditionCard({ label, entries, onClose, fontSize = '0.62rem' }) {
  return (
    <Box sx={cardSx}>
      <Box sx={cardHeaderSx}>
        <Typography sx={cardTitleSx}>{label}</Typography>
        <Box component="button" type="button" onClick={onClose} aria-label={`Close ${label}`} sx={cardCloseSx}>
          <X size={12} />
        </Box>
      </Box>
      <EntryBlocks
        entries={entries}
        spacing={0.4}
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
  border: 1,
  borderColor: alpha(CONDITION_ACCENT, 0.4),
  borderRadius: 1,
  p: '6px 8px',
  bgcolor: alpha(CONDITION_ACCENT, 0.05),
};

const cardHeaderSx = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.4 };

const cardTitleSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.62rem',
  fontWeight: 700,
  letterSpacing: '0.06em',
  color: CONDITION_ACCENT,
};

const cardCloseSx = {
  display: 'inline-flex',
  p: '1px',
  border: 0,
  bgcolor: 'transparent',
  cursor: 'pointer',
  color: 'text.secondary',
  borderRadius: '3px',
  '&:hover': { color: CONDITION_ACCENT },
};
