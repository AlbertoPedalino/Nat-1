import { Box, Stack, Typography, alpha, useTheme } from '@mui/material';
import { formatCampaignDateTime } from '../../../shared/gmboard/campaignTime.js';
import { hasWeatherDisadvantage, weatherName, weatherTone } from '../../../shared/gmboard/weather.js';
import { TERRAIN_ICONS, weatherIcon } from '../../../shared/hexcrawl/hexIcons.js';
import { terrainOption } from '../../../shared/hexcrawl/hexEntry.js';
import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import { FONT_SIZES, LINE_HEIGHTS } from '../../../shared/ui/fonts.js';
import { UI_SHADOWS } from '../../../shared/ui/shadows.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { OPACITY } from '../../../shared/ui/colors.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import { DURATIONS } from '../../../shared/ui/motion.js';

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
  const WeatherIcon = clock ? weatherIcon(clock.weather) : null;
  const disadvantage = clock ? hasWeatherDisadvantage(clock.weather, clock.intensity) : false;

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
        sx={{ ...bubbleSx, ...(onClose ? clickableSx : null) }}
      >
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mb: 0.25 }}>
          {TerrainIcon ? <TerrainIcon size={ICON_SIZES.xs} color={theme.palette.text.secondary} /> : null}
          <Typography sx={coordSx}>
            Hex {bubble.hex.q}, {bubble.hex.r}
            {/* What the leg cost, weather and mount included, rather than what
                the terrain costs a party on foot in the sun. */}
            {terrain ? ` · ${terrain.label} (${bubble.travelHours ?? terrain.hours}h)` : ''}
          </Typography>
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
            {WeatherIcon ? <WeatherIcon size={ICON_SIZES.xs} color={tone} /> : null}
            <Typography sx={{ ...footerTextSx, color: tone }}>
              {weatherName(clock.weather, clock.intensity)}
              {disadvantage ? ' · Dis' : ''}
            </Typography>
            <Typography sx={{ ...footerTextSx, ml: 'auto' }}>{formatCampaignDateTime(clock)}</Typography>
          </Stack>
        ) : null}

        <Box sx={tailSx} />
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

const bubbleSx = {
  position: 'relative',
  display: 'block',
  px: 1.5,
  py: 1,
  minWidth: 210,
  maxWidth: 340,
  textAlign: 'left',
  borderRadius: 2,
  bgcolor: VTT_COLORS.surfaceRaised,
  border: '2px solid',
  borderColor: 'divider',
  boxShadow: UI_SHADOWS.popup,
  // Grows out of the tail, which sits on the hex, so the answer looks spoken by
  // the ground the party is standing on.
  transformOrigin: 'bottom center',
  animation: `gbHexBubbleIn ${DURATIONS.slow}ms cubic-bezier(0.34, 1.4, 0.64, 1)`,
  '@keyframes gbHexBubbleIn': {
    from: { opacity: 0, transform: 'scale(0.25)' },
    to: { opacity: 1, transform: 'scale(1)' },
  },
};

const clickableSx = {
  pointerEvents: 'auto',
  cursor: 'pointer',
  font: 'inherit',
  '&:hover': { borderColor: vttAlpha(VTT_COLORS.accent, OPACITY.heavy) },
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
  borderTop: '1px solid',
};

const footerTextSx = { fontSize: FONT_SIZES.sm, color: 'text.secondary', whiteSpace: 'nowrap' };

const tailSx = {
  position: 'absolute',
  left: '50%',
  bottom: -8,
  ml: -1,
  width: 0,
  height: 0,
  borderLeft: '7px solid transparent',
  borderRight: '7px solid transparent',
  borderTop: `8px solid ${VTT_COLORS.surfaceRaised}`,
};
