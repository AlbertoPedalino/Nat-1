import { useId } from 'react';
import { Box, Button, Typography, useTheme } from '@mui/material';
import { captionLabelSx } from '../../ui/PanelHeader.jsx';
import { FONT_SIZES, LINE_HEIGHTS } from '../../ui/fonts.js';
import { OPACITY } from '../../ui/colors.js';
import { ICON_SIZES } from '../../ui/iconSizes.js';
import { focusRingSx } from '../../ui/interactive.js';
import { tintedSurfaceSx } from '../../ui/surfaces.js';
import { BUTTON_DESCRIPTION_SX } from '../../ui/actionButton.js';

// The one choice row of the GM Board and the map's hexcrawl (terrain,
// population, tier, mount, season, weather, dungeon and quest options): a
// caption, then a button per option, the chosen one lit in its tone.
//
// `getTone(option)` gives an option its own colour ({ color, dim }: the tier
// colours); without it the theme's gold. `dim` also tints the option while it
// is not chosen. `getIcon` and `getSub` add an icon and a second line;
// `dense` is the smaller size of the map's corner panel.
export default function SelectorGroup({
  label,
  options,
  value,
  onChange,
  getId = (o) => o.id,
  getLabel = (o) => o.label,
  getSub = (o) => o.sub,
  getIcon,
  getTone,
  dense = false,
  disabled = false,
}) {
  const theme = useTheme();
  const labelId = useId();
  const gold = { color: theme.palette.primary.main };

  return (
    <Box>
      {label ? <Typography id={labelId} sx={groupLabelSx}>{label}</Typography> : null}
      <Box role="group" aria-labelledby={label ? labelId : undefined} aria-label={label ? undefined : 'options'} sx={groupRowSx}>
        {options.map((option) => {
          const id = getId(option);
          const selected = value === id;
          const Icon = getIcon ? getIcon(option) : null;
          const sub = getSub(option);
          return (
            <Button
              key={id}
              size="small"
              variant="outlined"
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => onChange(option)}
              sx={optionSx(getTone ? getTone(option) : gold, selected, dense)}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {Icon ? <Icon size={dense ? ICON_SIZES.xs : ICON_SIZES.xs} /> : null}
                <span>{getLabel(option)}</span>
              </Box>
              {sub ? <Typography component="span" sx={subLabelSx}>{sub}</Typography> : null}
            </Button>
          );
        })}
      </Box>
    </Box>
  );
}

function optionSx(tone, selected, dense) {
  return {
    display: 'flex',
    flexDirection: 'column',
    gap: 0.25,
    minWidth: dense ? 54 : 72,
    py: 0.5,
    px: 0.75,
    fontSize: dense ? FONT_SIZES.sm : FONT_SIZES.md,
    lineHeight: LINE_HEIGHTS.tight,
    borderColor: selected ? tone.color : (tone.dim || 'divider'),
    color: selected ? tone.color : (tone.dim || 'text.secondary'),
    // Flat while not chosen; chosen or under the cursor, its tone washed over
    // the panel's paper rather than in place of it, so the option stays solid.
    ...(selected ? tintedSurfaceSx(tone.color, { amount: OPACITY.fill }) : { bgcolor: 'transparent' }),
    '&:hover': { borderColor: tone.color, ...tintedSurfaceSx(tone.color) },
    ...focusRingSx({ tone: tone.color }),
  };
}

const groupLabelSx = { ...captionLabelSx, mb: 0.5 };

const groupRowSx = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 0.75,
};

// The option's line of description, read as a description (prose, as written).
const subLabelSx = { ...BUTTON_DESCRIPTION_SX, fontSize: FONT_SIZES.xxs, opacity: OPACITY.veil };
