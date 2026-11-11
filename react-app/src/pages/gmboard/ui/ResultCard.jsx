import { Box, Stack, Typography, alpha, useTheme } from '@mui/material';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { microLabelSx } from '../../../shared/ui/PanelHeader.jsx';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { OPACITY, UI_COLORS } from '../../../shared/ui/colors.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';

// The card a generated result sits in (a dungeon room, a quest, a table on the
// Roll tab): a header band with an icon, a title and whatever `header` adds
// (badges, the dice), then the result's slots.
export function ResultCard({
  icon: Icon, title, header = null, highlighted = false, spacing = 0.75, headerSx = null, children,
}) {
  const theme = useTheme();
  return (
    <Box sx={{ ...cardSx, ...(highlighted ? { borderColor: 'primary.main' } : {}) }}>
      <Stack
        direction="row"
        spacing={0.75}
        sx={{ ...headerBandSx, ...headerSx, bgcolor: theme.palette.gmboard.headerOverlay }}
      >
        <Icon size={ICON_SIZES.xs} color={theme.palette.primary.main} />
        <Typography sx={cardTitleSx}>{title}</Typography>
        {header}
      </Stack>
      <Stack spacing={spacing} sx={{ p: 1.25 }}>{children}</Stack>
    </Box>
  );
}

// One part of a result, edged and tinted in its tone. With a `label`, its first
// row is the icon, the label, the badges and the dice it was rolled with.
export function ResultSlot({
  tone, icon: Icon, label, badges = null, dice, children,
}) {
  return (
    <Box sx={{ ...slotSx, borderLeftColor: tone, bgcolor: alpha(tone, OPACITY.soft) }}>
      {label ? (
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          {Icon ? <Icon size={ICON_SIZES.xs} color={tone} /> : null}
          <Typography sx={microLabelSx}>{label}</Typography>
          {badges}
          {dice ? <Typography sx={resultDetailSx}>{dice}</Typography> : null}
        </Stack>
      ) : null}
      {children}
    </Box>
  );
}

// A line of detail under a slot's first row.
export function ResultLine({ children }) {
  return <Typography sx={lineSx}>{children}</Typography>;
}

// Small secondary text (the dice, a table's notation).
export const resultDetailSx = {
  fontSize: FONT_SIZES.sm,
  color: 'text.secondary',
};

const cardSx = {
  border: '2px solid',
  borderColor: UI_COLORS.edge,
  borderRadius: 2,
  overflow: 'hidden',
};

const headerBandSx = {
  alignItems: 'center',
  flexWrap: 'wrap',
  px: 1.25,
  py: 0.75,
  borderBottom: '1px solid',
  borderColor: 'divider',
};

const cardTitleSx = {
  ...TEXT_STYLES.title,
  fontSize: FONT_SIZES.lg,
  color: 'primary.main',
};

const slotSx = {
  p: 0.75,
  borderRadius: 1,
  border: '2px solid',
  borderColor: UI_COLORS.edge,
  borderLeftWidth: 3,
};

const lineSx = {
  fontSize: FONT_SIZES.lg,
  color: 'text.primary',
  mt: 0.25,
};
