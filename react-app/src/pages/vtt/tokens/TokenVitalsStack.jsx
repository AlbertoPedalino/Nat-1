import { Box } from '@mui/material';
import { normalizeDeathSaves } from '../../../shared/character/combat/vitals.js';
import HitPointBars from '../../../shared/character/combat/HitPointBars.jsx';
import { METER_SEGMENTS } from '../../../shared/ui/shapes.js';
import { VTT_COLORS, VTT_HP_TONE_COLORS } from '../../../shared/vtt/colors.js';
import {
  stackInsideSx,
  stackBelowSx,
  hpBarSx,
  deathTrackSx,
  deathDotsSx,
  deathDotSx,
  deathSuccessSx,
  deathFailureSx,
  deathDividerSx,
  hpTextSx,
  tempBarSx,
  tempTextSx,
  plateSx,
  secretPlateSx,
} from './tokenSpriteStyles.js';

// Bars and plate stack under the art. The numbers ride inside the bar rather
// than beside it: one strip to read instead of two things to line up, and it
// stays legible over any map.
export default function TokenVitalsStack({
  token,
  name,
  hex,
  hasHandles,
  hasHp,
  current,
  showDeathSaves,
  canSetDeathSaves,
  onDeathSaveChange,
}) {
  const { success: deathSuccesses, fail: deathFailures } = normalizeDeathSaves(token.deathSaves);

  return (
    <Box sx={hasHandles ? stackBelowSx : stackInsideSx}>
      {/* The whole name where it fits; a long one is cut at the edge of
          the cell rather than written across the next. First in the
          stack, so the eye reads who it is before how hurt they are.
          A name the players never receive wears the dashed gold of
          everything else only the GM sees. */}
      {name ? (
        <Box
          sx={{
            ...plateSx,
            ...(token.secretLabel ? secretPlateSx : null),
            maxWidth: hasHandles ? 'none' : (hex ? '100%' : '116%'),
          }}
        >
          {name}
        </Box>
      ) : null}

      {showDeathSaves ? (
        <Box
          aria-label={`${deathSuccesses} death save successes, ${deathFailures} failures`}
          title={`${deathSuccesses}/3 successes · ${deathFailures}/3 failures`}
          sx={{ ...deathTrackSx, pointerEvents: canSetDeathSaves ? 'auto' : 'none' }}
        >
          <Box sx={deathDotsSx}>
            {[0, 1, 2].map((index) => (
              <Box
                component="button"
                type="button"
                key={`success-${index}`}
                aria-label={`Death save success ${index + 1}`}
                disabled={!canSetDeathSaves}
                data-death-save="success"
                data-active={index < deathSuccesses ? 'true' : 'false'}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  onDeathSaveChange?.('success', deathSuccesses === index + 1 ? index : index + 1);
                }}
                sx={{ ...deathDotSx, ...(index < deathSuccesses ? deathSuccessSx : null) }}
              />
            ))}
          </Box>
          <Box sx={deathDividerSx} />
          <Box sx={deathDotsSx}>
            {[0, 1, 2].map((index) => (
              <Box
                component="button"
                type="button"
                key={`failure-${index}`}
                aria-label={`Death save failure ${index + 1}`}
                disabled={!canSetDeathSaves}
                data-death-save="failure"
                data-active={index < deathFailures ? 'true' : 'false'}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  onDeathSaveChange?.('fail', deathFailures === index + 1 ? index : index + 1);
                }}
                sx={{ ...deathDotSx, ...(index < deathFailures ? deathFailureSx : null) }}
              />
            ))}
          </Box>
        </Box>
      ) : hasHp ? (
        // Its temporary hit points in a bar of their own under the real one
        // (HitPointBars), each with its figures inside.
        <HitPointBars
          bare
          current={current}
          max={token.hpMax}
          temp={token.tempHp || 0}
          tones={VTT_HP_TONE_COLORS}
          tempTone={VTT_COLORS.tempHp}
          // Fewer, longer segments than a sheet's: the bar is a few pixels tall.
          segments={METER_SEGMENTS.piece}
          hpSx={[hpBarSx, { width: hex ? '72%' : '88%' }]}
          tempSx={[tempBarSx, { width: hex ? '60%' : '72%' }]}
          hpFigures={<Box component="span" sx={hpTextSx}>{current}/{token.hpMax}</Box>}
          tempFigures={<Box component="span" sx={tempTextSx}>+{token.tempHp}</Box>}
        />
      ) : null}
    </Box>
  );
}
