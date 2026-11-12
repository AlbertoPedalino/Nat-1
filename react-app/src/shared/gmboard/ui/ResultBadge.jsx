import { useTheme } from '@mui/material';
import TagChip from '../../ui/TagChip.jsx';
import { ICON_SIZES } from '../../ui/iconSizes.js';

// A fact a GM Board roll came up with (a room's type, a difficulty, a reward,
// a quest's event): the app's read-only sticker chip in the fact's tone, a
// quiet tone when it has none. The look is TagChip's; this only names the
// board's default tone and sizes the icon.
export default function ResultBadge({ children, tone, icon: Icon }) {
  const theme = useTheme();
  return (
    <TagChip
      component="span"
      label={children}
      tone={tone || theme.palette.gmboard.result.none}
      icon={Icon ? <Icon size={ICON_SIZES.xxs} /> : undefined}
    />
  );
}
