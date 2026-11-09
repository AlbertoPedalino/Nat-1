import { Box, Typography } from '@mui/material';
import DieFace2D from './DieFace2D.jsx';
import { rollLogCalculation, rollLogDieColor, rollOutcome } from './rollLogPresentation.js';
import { FONT_SIZES } from '../../ui/fonts.js';

export default function RollCalculation({ entry }) {
  const { dice, modifier, total, formula, modeLabel } = rollLogCalculation(entry);
  let keptCount = 0;
  return (
    <Box>
      {formula || modeLabel ? (
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', overflowWrap: 'anywhere' }}>
          {modeLabel ? `${modeLabel} · ` : ''}{formula}
        </Typography>
      ) : null}
      <Box role="group" aria-label="Roll calculation" sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5, my: 0.5 }}>
        {dice.map((die, index) => {
          const operator = die.kept === false ? null : die.sign < 0 ? '−' : keptCount > 0 ? '+' : null;
          if (die.kept !== false) keptCount += 1;
          return (
            <Box key={index} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
              {operator ? <Typography sx={{ color: 'text.secondary' }}>{operator}</Typography> : null}
              <DieFace2D value={die.v} faces={die.faces} color={rollLogDieColor(die)} dimmed={die.kept === false} />
              {die.kept === false ? <Typography variant="caption" sx={{ color: 'text.secondary' }}>discarded</Typography> : null}
            </Box>
          );
        })}
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, whiteSpace: 'nowrap' }}>
          {dice.length > 0 && modifier !== 0 ? <Typography sx={{ fontWeight: 700 }}>{modifier < 0 ? '−' : '+'} {Math.abs(modifier)}</Typography> : null}
          {dice.length > 0 && total != null ? <Typography sx={{ color: 'text.secondary' }}>=</Typography> : null}
          {total != null ? <Typography sx={{ fontWeight: 800, fontSize: FONT_SIZES.lead, color: rollOutcome(entry).color }}>{total}</Typography> : null}
        </Box>
      </Box>
    </Box>
  );
}
