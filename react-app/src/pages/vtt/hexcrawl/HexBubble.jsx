import { Box, Stack, Typography, alpha, useTheme } from '@mui/material';
import { formatCampaignDateTime } from '../../../shared/gmboard/campaignTime.js';
import { weatherTone } from '../../../shared/gmboard/weather.js';
import { TERRAIN_ICONS } from '../../../shared/hexcrawl/hexIcons.js';
import { terrainOption } from '../../../shared/hexcrawl/hexEntry.js';
import { VTT_COLORS } from '../../../shared/vtt/colors.js';
import { FONT_SIZES, LINE_HEIGHTS } from '../../../shared/ui/fonts.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { OPACITY } from '../../../shared/ui/colors.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import { BARE_BUTTON_SX, CARD_PART_RULE_SX } from '../../../shared/ui/interactive.js';
import { BUBBLE_FROM_TAIL_SX, bubbleSx, bubbleTailSx } from '../../../shared/ui/bubble.js';
import { hexLabel } from './hexLabel.js';
import WeatherTag from './WeatherTag.jsx';

// What the hex just did, spoken over the hex. The same speech bubble a piece
// gets when it rolls, for the same reason: a hexcrawl is a sequence of small
// answers, and a modal for each one turns walking across a map into paperwork.
//
// It is sized to hold the whole answer — where, when, what the sky is doing and
// every line the entry produced — because a bubble that only fits half of it
// sends the GM into the dialog for the other half, which is the modal it exists
// to avoid. A click puts it away; every die stays behind "See the rolls" in the
// hexcrawl corner.
export default function HexBubble({ bubble, x, y, onClose }) {
  const theme = useTheme();
  const clock = bubble.clock || null;
  const terrain = terrainOption(bubble.hex?.terrain);
  const TerrainIcon = terrain ? TERRAIN_ICONS[terrain.id] : null;
  const tone = clock ? weatherTone(theme.palette, clock.weather) : null;

  return (
    <Box sx={{ ...rootSx, transform: `translate(${x}px, ${y}px) translate(-50%, -100%)` }}>
      <Box
        component={onClose ? 'button' : 'div'}
        type={onClose ? 'button' : undefined}
        onClick={onClose}
        // A control over the map, not the map: without this the press reaches
        // the viewport too and picks the hex behind the bubble.
        data-viewport-control=""
        aria-label={onClose ? `${bubble.headline} — close` : undefined}
        sx={{ ...(onClose ? clickableSx : null), ...hexBubbleSx }}
      >
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mb: 0.25 }}>
          {TerrainIcon ? <TerrainIcon size={ICON_SIZES.xs} color={theme.palette.text.secondary} /> : null}
          {/* What the leg cost, weather and mount included, rather than what
              the terrain costs a party on foot in the sun. */}
          <Typography sx={coordSx}>{hexLabel(bubble.hex, bubble.travelHours)}</Typography>
        </Stack>

        <Typography sx={headlineSx}>{bubble.headline}</Typography>

        <Stack spacing={0.25} sx={{ mt: 0.5 }}>
          {(bubble.lines || []).map((line) => (
            <Typography key={line} sx={lineSx}>{line}</Typography>
          ))}
        </Stack>

        {clock ? (
          <Stack
            direction="row"
            spacing={0.75}
            sx={{ ...footerSx, borderColor: alpha(tone || theme.palette.divider, OPACITY.edge) }}
          >
            <WeatherTag weather={clock.weather} intensity={clock.intensity} />
            <Typography sx={{ ...footerTextSx, ml: 'auto' }}>{formatCampaignDateTime(clock)}</Typography>
          </Stack>
        ) : null}

      </Box>
    </Box>
  );
}

const rootSx = {
  position: 'absolute',
  left: 0,
  top: 0,
  zIndex: 7,
  // The bubble itself takes the clicks; the box that positions it must not, or
  // it would swallow drags on the map around it.
  pointerEvents: 'none',
};

// The comic speech bubble a piece gets when it rolls, spoken here by the hex
// the party stands on: its tail on the hex.
const hexBubbleSx = {
  position: 'relative',
  display: 'block',
  px: 1.5,
  py: 1,
  minWidth: 210,
  maxWidth: 340,
  textAlign: 'left',
  ...bubbleSx({ pop: false }),
  ...bubbleTailSx({ side: 'bottom', at: '50%' }),
  ...BUBBLE_FROM_TAIL_SX,
};

// Dismissed by a click: a bare button, the bubble its whole look.
const clickableSx = {
  ...BARE_BUTTON_SX,
  pointerEvents: 'auto',
  '&:focus-visible': { outline: `2px solid ${VTT_COLORS.accent}`, outlineOffset: 2 },
};

const coordSx = {
  ...TEXT_STYLES.label,
  fontSize: FONT_SIZES.xs,
  color: 'text.secondary',
};

const headlineSx = {
  ...TEXT_STYLES.figure,
  fontSize: FONT_SIZES.body,
  color: VTT_COLORS.accent,
  lineHeight: LINE_HEIGHTS.snug,
};

const lineSx = { fontSize: FONT_SIZES.lg, color: 'text.primary', lineHeight: LINE_HEIGHTS.normal };

const footerSx = {
  alignItems: 'center',
  mt: 0.75,
  pt: 0.5,
  ...CARD_PART_RULE_SX,
};

const footerTextSx = { fontSize: FONT_SIZES.sm, color: 'text.secondary', whiteSpace: 'nowrap' };

