import { Box, Typography } from '@mui/material';

const FONT = '"Cinzel", Georgia, serif';

// What the hex just did, spoken over the hex. The same speech bubble a piece
// gets when it rolls, for the same reason: a hexcrawl is a sequence of small
// answers, and a modal for each one turns walking across a map into paperwork.
//
// Unlike a roll bubble this one can be clicked — every die is in the dialog
// behind it, one click away for when the answer matters.
export default function HexBubble({ bubble, x, y, onOpen }) {
  return (
    <Box sx={{ ...rootSx, transform: `translate(${x}px, ${y}px) translate(-50%, -100%)` }}>
      <Box
        component={onOpen ? 'button' : 'div'}
        type={onOpen ? 'button' : undefined}
        onClick={onOpen}
        aria-label={onOpen ? `${bubble.headline} — see every roll` : undefined}
        sx={{ ...bubbleSx, ...(onOpen ? clickableSx : null) }}
      >
        <Typography sx={coordSx}>Hex {bubble.hex.q}, {bubble.hex.r}</Typography>
        <Typography sx={headlineSx}>{bubble.headline}</Typography>
        {(bubble.lines || []).map((line) => (
          <Typography key={line} sx={lineSx}>{line}</Typography>
        ))}
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
  px: 1.2,
  py: 0.9,
  minWidth: 140,
  maxWidth: 240,
  textAlign: 'center',
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
  fontSize: '0.55rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'text.secondary',
};

const headlineSx = {
  fontFamily: FONT,
  fontSize: '0.78rem',
  fontWeight: 700,
  color: '#e8c96a',
  lineHeight: 1.25,
  my: 0.2,
};

const lineSx = { fontSize: '0.66rem', color: 'text.primary', lineHeight: 1.35 };

const moreSx = {
  mt: 0.4,
  fontSize: '0.55rem',
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
