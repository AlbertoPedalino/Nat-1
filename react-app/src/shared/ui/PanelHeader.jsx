import { Box, Typography } from '@mui/material';
import { UI_COLORS } from './colors.js';
import { UI_FONTS } from './fonts.js';

// The title bar of a sheet panel (Saving Throws, Skills, Senses, Movement,
// Proficiencies) and of SheetDialog: a dark bar with a gold left accent, an
// icon and an uppercase Cinzel title. `tone` recolours the accent and the
// title (Movement turns orange under a penalty); `children` go at the end.

export const panelBarSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  bgcolor: UI_COLORS.headerBg,
  borderBottom: 1,
  borderColor: 'divider',
  borderLeft: 3,
  borderLeftColor: 'primary.main',
};

export const panelTitleSx = {
  fontFamily: UI_FONTS.display,
  fontSize: '0.625rem',
  fontWeight: 700,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'primary.main',
};

// The small uppercase label of a section inside a panel.
export const sectionLabelSx = {
  fontFamily: UI_FONTS.display,
  fontSize: '0.5rem',
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
};

export default function PanelHeader({ icon: Icon, title, tone = 'primary.main', children }) {
  return (
    <Box sx={{ ...panelBarSx, px: '0.8rem', py: '0.48rem', borderLeftColor: tone }}>
      {Icon ? <Icon size={14} /> : null}
      <Typography sx={{ ...panelTitleSx, color: tone }}>{title}</Typography>
      {children}
    </Box>
  );
}
