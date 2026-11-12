import { Button, Stack, Typography } from '@mui/material';
import { Hourglass, Moon } from 'lucide-react';
import SheetDialog, { CancelButton } from '../../../shared/ui/SheetDialog.jsx';
import HitDiceSpendControl from './HitDiceSpendControl.jsx';
import { getMod, getFinal } from '../../../shared/character/sheet/sheetStats.js';
import { getHitDicePools, getUsedHitDiceTotal } from '../../../shared/character/resources/restResources.js';
import { clamp } from '../../../shared/numbers.js';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';

// The Short Rest dialog (Hit Dice to spend, per pool) and the Long Rest
// confirmation. `rest` is the state and handlers from useRests.
export default function RestDialogs({ C, sheet, rest }) {
  const hitDicePools = getHitDicePools(C, sheet.usedHDPools, sheet.usedHD);
  const totalHitDiceRemaining = hitDicePools.reduce((sum, pool) => sum + pool.remaining, 0);
  const totalHitDiceToSpend = getUsedHitDiceTotal(rest.hdToSpend);
  const conMod = getMod(getFinal(C, 'con'));

  return (
    <>
      <SheetDialog
        open={rest.shortRestOpen}
        onClose={rest.closeShortRest}
        title="Short Rest"
        icon={<Hourglass size={ICON_SIZES.xl} />}
        actions={(
          <>
            <CancelButton onClick={rest.closeShortRest} />
            <Button variant="contained" onClick={rest.confirmShortRest}>
              Take Short Rest
            </Button>
          </>
        )}
      >
        <Typography sx={{ fontSize: FONT_SIZES.xl, color: 'text.secondary', mb: 2 }}>
          Optionally spend Hit Dice to recover HP. Each die adds CON mod ({conMod}). Resources that recharge on a Short Rest will still recover even if you spend no Hit Dice.
        </Typography>
        <Typography sx={{ fontSize: FONT_SIZES.md, color: 'text.secondary', mb: 1 }}>
          Available: {totalHitDiceRemaining} HD
        </Typography>
        <Stack spacing={1.25}>
          {hitDicePools.map((pool) => {
            const value = clamp(Number(rest.hdToSpend[pool.key] || 0), 0, pool.remaining);
            return (
              <HitDiceSpendControl
                key={pool.key}
                pool={pool}
                value={value}
                conMod={conMod}
                onChange={(next) => rest.setHdToSpend((prev) => ({ ...prev, [pool.key]: next }))}
              />
            );
          })}
        </Stack>
        <Typography sx={{ fontSize: FONT_SIZES.md, color: 'text.secondary', textAlign: 'center', mt: 1.25 }}>
          {totalHitDiceToSpend > 0 ? `Spending ${totalHitDiceToSpend} HD` : 'No Hit Dice will be spent'}
        </Typography>
      </SheetDialog>

      <SheetDialog
        open={rest.longRestOpen}
        onClose={rest.closeLongRest}
        title="Take a Long Rest?"
        icon={<Moon size={ICON_SIZES.xl} />}
        actions={(
          <>
            <CancelButton onClick={rest.closeLongRest} />
            <Button variant="contained" onClick={rest.confirmLongRest}>Confirm Long Rest</Button>
          </>
        )}
      >
        <Typography sx={{ fontSize: FONT_SIZES.xl, color: 'text.secondary' }}>
          This will restore all HP, Hit Dice, spell slots, and class resources.
        </Typography>
      </SheetDialog>
    </>
  );
}
