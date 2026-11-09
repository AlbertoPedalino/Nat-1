import { Box, ButtonBase, Stack, Typography } from '@mui/material';
import { ChevronDown } from 'lucide-react';
import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import InfoHint from '../../../shared/ui/InfoHint.jsx';
import CollapsibleBody from '../../../shared/ui/CollapsibleBody.jsx';
import { UI_FONTS, FONT_SIZES, LETTER_SPACINGS } from '../../../shared/ui/fonts.js';

// The building blocks of the GM's scene panel (MapPanel): a collapsible section
// with a one-line summary, and the small labels inside it.

// The explanations used to sit under the controls as captions. Over a map they
// are the wrong trade: the panel lives inside the board, so every line of prose
// is a line of map, and the text is read once and then in the way forever.
// Behind an icon it is still one hover away for whoever has not met the control
// yet.
//
// Focusable on purpose: a tooltip only reachable by hover is not reachable at
// all on a touch screen or from the keyboard.
export function SectionLabel({ label, hint }) {
  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>{label}</Typography>
      {hint ? <InfoHint label={`About the ${label.toLowerCase()}`} text={hint} /> : null}
    </Stack>
  );
}

// One question about the scene behind one header. Closed, the header still
// answers it in a line ("Squares · 70 px · shown"), so the panel reads as an
// overview first and a form second.
export function PanelSection({ id, icon: Icon, title, summary, open, onToggle, children }) {
  const bodyId = `scene-panel-${id}`;
  return (
    <Box sx={sectionSx}>
      <ButtonBase
        onClick={() => onToggle(id)}
        aria-expanded={open}
        aria-controls={bodyId}
        sx={sectionHeaderSx}
      >
        <Box component="span" sx={sectionIconSx}><Icon size={15} strokeWidth={1.8} /></Box>
        <Box component="span" sx={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
          <Typography component="span" sx={sectionTitleSx}>{title}</Typography>
          {open ? null : (
            <Typography component="span" variant="caption" noWrap sx={sectionSummarySx}>
              {summary}
            </Typography>
          )}
        </Box>
        <Box
          component="span"
          sx={{ display: 'flex', color: VTT_COLORS.textSecondary, transition: 'transform 150ms', transform: open ? 'rotate(180deg)' : 'none' }}
        >
          <ChevronDown size={15} />
        </Box>
      </ButtonBase>
      <CollapsibleBody open={open} id={bodyId}>
        <Stack spacing={1} sx={{ px: 1, pt: 0.25, pb: 1.1 }}>{children}</Stack>
      </CollapsibleBody>
    </Box>
  );
}

const sectionSx = {
  borderRadius: 1,
  border: `1px solid ${vttAlpha(VTT_COLORS.accent, 0.16)}`,
  bgcolor: vttAlpha(VTT_COLORS.accent, 0.03),
  overflow: 'hidden',
};

const sectionHeaderSx = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: 0.85,
  px: 1,
  py: 0.75,
  color: VTT_COLORS.text,
  '&:hover': { bgcolor: vttAlpha(VTT_COLORS.accent, 0.08) },
  '&.Mui-focusVisible': { outline: `1px solid ${VTT_COLORS.accent}`, outlineOffset: -1 },
};

const sectionIconSx = { display: 'flex', color: VTT_COLORS.accent, flexShrink: 0 };

const sectionTitleSx = {
  display: 'block',
  fontFamily: UI_FONTS.display,
  fontSize: FONT_SIZES.sm,
  letterSpacing: LETTER_SPACINGS.md,
  lineHeight: 1.4,
};

const sectionSummarySx = {
  display: 'block',
  color: VTT_COLORS.textMuted,
  lineHeight: 1.3,
};
