import { Box, Typography, Tooltip } from '@mui/material';
import { getEquippedArmorPenalties } from '../logic/armorPenalties.js';
import { STATS, SLBL, FULL_LBL, getFinal, getMod, getPB, fbonus } from '../logic/calculations.js';
import { useProficiencySets } from '../context/ProficiencySetsContext.jsx';
import { advantageVisual } from './advantageMark.jsx';

export default function AbilityScores({ C, sheet, onRoll }) {
  const pb = getPB(C);
  const profSets = useProficiencySets();
  const armorPenalties = getEquippedArmorPenalties(C, sheet?.sheetInventory || C?.inventory || [], profSets);

  return (
    <Box sx={{
      display: 'flex', alignItems: 'stretch', gap: '0.6rem',
      flexWrap: 'nowrap',
    }}>
      <Box sx={{
        display: 'grid', gridTemplateColumns: { xs: 'repeat(4,1fr)', sm: 'repeat(8,minmax(62px,1fr))' },
        gap: '0.6rem', flex: '1 1 520px', minWidth: 0,
      }}>
        {STATS.map(s => {
          const val = getFinal(C, s);
          const mod = getMod(val);
          const hasDisadv = armorPenalties.hasPenalty && armorPenalties.disadvantageOn.includes(`${s}-checks`);
          const visual = advantageVisual(false, hasDisadv);
          return (
            <Box key={s} onClick={() => onRoll(mod, FULL_LBL[s] + ' Check', hasDisadv ? false : undefined)}
              sx={{
                bgcolor: 'background.paper', border: 1, borderColor: hasDisadv ? 'warning.main' : 'divider', borderRadius: 1,
                display: 'flex', flexDirection: 'column', alignItems: 'center', p: '0.4rem 0.25rem',
                cursor: 'pointer', transition: 'border-color 0.15s',
                '&:hover': { borderColor: 'primary.main' },
              }}>
              <Typography sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.14em', color: 'text.secondary', textTransform: 'uppercase', mb: 0.1 }}>
                {SLBL[s]}
              </Typography>
              <Typography sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '1.5rem', fontWeight: 700, color: '#edd48a', lineHeight: 1 }}>
                {fbonus(mod)}
              </Typography>
              <Box sx={{
                fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.56rem', fontWeight: 600, color: 'text.secondary',
                bgcolor: 'rgba(35,32,26,1)', border: 1, borderColor: 'divider', borderRadius: '50%',
                width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 0.25,
              }}>
                {val}
              </Box>
              {visual ? (
                <Tooltip title="Disadvantage from armor">
                  <visual.Icon size={12} style={{ color: visual.color, marginTop: '2px' }} />
                </Tooltip>
              ) : null}
            </Box>
          );
        })}
        <Box sx={{
          bgcolor: 'rgba(35,32,26,1)', border: 1, borderColor: 'divider', borderRadius: 1,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: '0.42rem 0.68rem', textAlign: 'center', minWidth: 64,
        }}>
          <Typography sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '1.25rem', fontWeight: 700, color: '#58b879', lineHeight: 1 }}>
            {fbonus(pb)}
          </Typography>
          <Typography sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.5rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'text.secondary', mt: 0.25 }}>
            Prof. Bonus
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
