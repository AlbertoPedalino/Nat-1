import { Box, Stack, Typography, alpha, useTheme } from '@mui/material';
import { formatDateTime } from '../../gmboard/logic/time.js';
import { hasWeatherDisadvantage } from '../../gmboard/logic/weather.js';
import {
  FALLBACK_WEATHER_ICON, TERRAIN_ICONS, WEATHER_ICONS,
} from '../../gmboard/components/hexIcons.js';
import { terrainOption } from '../../../shared/hexcrawl/hexEntry.js';

const FONT = '"Cinzel", Georgia, serif';

// What the hex just did, spoken over the hex. The same speech bubble a piece
// gets when it rolls, for the same reason: a hexcrawl is a sequence of small
// answers, and a modal for each one turns walking across a map into paperwork.
//
// It is sized to hold the whole answer — where, when, what the sky is doing and
// every line the entry produced — because a bubble that only fits half of it
// sends the GM into the dialog for the other half, which is the modal it exists
// to avoid. Every die is still one click behind it.
export default function HexBubble({ bubble, x, y, onOpen }) {
  const theme = useTheme();
  const clock = bubble.clock || null;
  const terrain = terrainOption(bubble.hex?.terrain);
  const TerrainIcon = terrain ? TERRAIN_ICONS[terrain.id] : null;
  const tone = clock ? theme.palette.gmboard.weather[clock.meteo] : null;
  const WeatherIcon = clock ? (WEATHER_ICONS[clock.meteo] || FALLBACK_WEATHER_ICON) : null;
  const disadvantage = clock ? hasWeatherDisadvantage(clock.meteo, clock.intensity) : false;

  return (
    <Box sx={{ ...rootSx, transform: `translate(${x}px, ${y}px) translate(-50%, -100%)` }}>
      <Box
        component={onOpen ? 'button' : 'div'}
        type={onOpen ? 'button' : undefined}
        onClick={onOpen}
        aria-label={onOpen ? `${bubble.headline} — see every roll` : undefined}
        sx={{ ...bubbleSx, ...(onOpen ? clickableSx : null) }}
      >
        <Stack direction="row" spacing={0.6} sx={{ alignItems: 'center', mb: 0.35 }}>
          {TerrainIcon ? <TerrainIcon size={12} color={theme.palette.text.secondary} /> : null}
          <Typography sx={coordSx}>
            Hex {bubble.hex.q}, {bubble.hex.r}
            {/* What the leg cost, weather and mount included, rather than what
                the terrain costs a party on foot in the sun. */}
            {terrain ? ` · ${terrain.label} (${bubble.travelHours ?? terrain.hours}h)` : ''}
          </Typography>
        </Stack>

        <Typography sx={headlineSx}>{bubble.headline}</Typography>

        <Stack spacing={0.15} sx={{ mt: 0.5 }}>
          {(bubble.lines || []).map((line) => (
            <Typography key={line} sx={lineSx}>{line}</Typography>
          ))}
        </Stack>

        {clock ? (
          <Stack
            direction="row"
            spacing={0.8}
            sx={{ ...footerSx, borderColor: alpha(tone || theme.palette.divider, 0.4) }}
          >
            {WeatherIcon ? <WeatherIcon size={13} color={tone} /> : null}
            <Typography sx={{ ...footerTextSx, color: tone }}>
              {clock.meteo}{clock.intensity ? ` · ${clock.intensity}` : ''}
              {disadvantage ? ' · Dis' : ''}
            </Typography>
            <Typography sx={{ ...footerTextSx, ml: 'auto' }}>{formatDateTime(clock)}</Typography>
          </Stack>
        ) : null}

        {onOpen ? <Typography sx={moreSx}>Click for the rolls</Typography> : null}
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
  py: 1.1,
  minWidth: 210,
  maxWidth: 340,
  textAlign: 'left',
  borderRadius: 2,
  bgcolor: 'rgba(26,23,19,0.97)',
  border: '2px solid',
  borderColor: 'divider',
  boxShadow: '0 8px 26px rgba(0,0,0,0.6)',
  // Grows out of the tail, which sits on the hex, so the answer looks spoken by
  // the ground the party is standing on.
  transformOrigin: 'bottom center',
  animation: 'gbHexBubbleIn 220ms cubic-bezier(0.34, 1.4, 0.64, 1)',
  '@keyframes gbHexBubbleIn': {
    from: { opacity: 0, transform: 'scale(0.25)' },
    to: { opacity: 1, transform: 'scale(1)' },
  },
};

const clickableSx = {
  pointerEvents: 'auto',
  cursor: 'pointer',
  font: 'inherit',
  '&:hover': { borderColor: 'rgba(232,201,106,0.75)' },
};

const coordSx = {
  fontFamily: FONT,
  fontSize: '0.6rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'text.secondary',
};

const headlineSx = {
  fontFamily: FONT,
  fontSize: '0.95rem',
  fontWeight: 700,
  color: '#e8c96a',
  lineHeight: 1.25,
};

const lineSx = { fontSize: '0.78rem', color: 'text.primary', lineHeight: 1.4 };

const footerSx = {
  alignItems: 'center',
  mt: 0.7,
  pt: 0.5,
  borderTop: '1px solid',
};

const footerTextSx = { fontSize: '0.68rem', color: 'text.secondary', whiteSpace: 'nowrap' };

const moreSx = {
  mt: 0.5,
  fontSize: '0.58rem',
  letterSpacing: '0.06em',
  color: 'text.secondary',
};

const tailSx = {
  position: 'absolute',
  left: '50%',
  bottom: -8,
  ml: '-7px',
  width: 0,
  height: 0,
  borderLeft: '7px solid transparent',
  borderRight: '7px solid transparent',
  borderTop: '8px solid rgba(26,23,19,0.97)',
};
