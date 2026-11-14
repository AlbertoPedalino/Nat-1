import { Box } from '@mui/material';
import SegmentedMeter from '../../ui/SegmentedMeter.jsx';
import { HP_TONE_COLORS, TEMP_HP_TONE } from '../../ui/colors.js';
import { hitPointShares, hpToneColor } from './vitals.js';
import { asArray } from '../../lists.js';

// A creature's hit points as bars (SegmentedMeter): its Hit Points, in the
// tone of how hurt it is (`tones`: HP_TONE_COLORS, or the map's), and while it
// has some its temporary ones, in `tempTone`, in a bar of their own under it:
// folded into the same strip they would show a creature healthier than it
// can be. Stacked in a column across the width (`sx` places it); `bare` hands
// the two bars to the caller's own column instead (a piece on the map lays
// its plate and bars out together). `hpSx` / `tempSx` size each bar,
// `hpFigures` / `tempFigures` ride inside them. Every hit point bar of the app
// (the sheet, a combatant, a companion, a piece on the map) is this one.
//
// The cushion's bar comes and goes with the cushion: the last of it spent
// takes the bar away at once, without the drain a hit shows.
export default function HitPointBars({
  current, max, temp = 0, tones = HP_TONE_COLORS, tempTone = TEMP_HP_TONE, segments,
  hpSx, tempSx, hpFigures = null, tempFigures = null, bare = false, sx,
}) {
  const shares = hitPointShares(current, max, temp);
  const bars = (
    <>
      <SegmentedMeter
        ratio={shares.hp}
        tone={hpToneColor(current, max, tones)}
        segments={segments}
        title="Hit points"
        valueText={`${current} of ${max} hit points`}
        sx={hpSx}
      >
        {hpFigures}
      </SegmentedMeter>
      {Number(temp) > 0 ? (
        <SegmentedMeter
          ratio={shares.temp}
          tone={tempTone}
          segments={segments}
          title="Temporary hit points"
          valueText={`${temp} temporary hit points`}
          sx={[TEMP_SX, ...asArray(tempSx)]}
        >
          {tempFigures}
        </SegmentedMeter>
      ) : null}
    </>
  );
  if (bare) return bars;
  return <Box sx={[STACK_SX, ...asArray(sx)]}>{bars}</Box>;
}

const STACK_SX = { display: 'flex', flexDirection: 'column', gap: 0.5, width: '100%' };

// The cushion's bar: thinner than the Hit Points' own.
const TEMP_SX = { height: 7 };
