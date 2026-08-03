import { Box, Typography } from '@mui/material';
import D100Orb from './D100Orb.jsx';
import Die3D from './Die3D.jsx';

// The dice a roll landed on, then whatever was added to them. Shared so a roll
// looks the same wherever it is shown: the sheet's toast, the bubble over a
// piece on the map, the map's roll panel.
//
// `seed` must identify the roll, not the render — it is what keeps the dice
// from re-throwing themselves every time React comes back around.
export default function DiceRow({ dice, modifier, seed, size, solid = false, justify = 'flex-start' }) {
  if (!dice?.length && !modifier) return null;

  return (
    <Box sx={{ ...rowSx, justifyContent: justify }}>
      {(dice || []).map((die, index) => (
        Number(die.faces) === 100 ? (
          <D100Orb
            key={index}
            value={die.value}
            color={die.color}
            dimmed={die.dimmed}
            size={size}
          />
        ) : (
          <Die3D
            key={index}
            value={die.value}
            faces={die.faces}
            color={die.color}
            dimmed={die.dimmed}
            size={size}
            solid={solid}
            seed={`${seed}:${index}`}
          />
        )
      ))}
      {modifier ? <Typography sx={modifierSx}>{modifier}</Typography> : null}
    </Box>
  );
}

const rowSx = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 0.4,
  my: 0.4,
  alignItems: 'center',
};

const modifierSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.875rem',
  fontWeight: 700,
  color: 'text.secondary',
  ml: 0.3,
};
