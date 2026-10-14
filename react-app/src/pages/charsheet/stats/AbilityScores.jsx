import { Box, Typography, Tooltip } from '@mui/material';
import { getEquippedArmorPenalties } from '../inventory/armorPenalties.js';
import { STATS, SLBL, FULL_LBL, getFinal, getMod, getPB, fbonus, effectiveD20Modifier } from '../state/calculations.js';
import { describeCheckDisadvantage } from '../../../shared/character/combat/conditions.js';
import { useProficiencySets } from '../proficiency/ProficiencySetsContext.jsx';
import { advantageVisual, conditionalDisadvantageVisual } from './advantageMark.jsx';
import RollModeArea from '../../../shared/character/dice/RollModeArea.jsx';

export default function AbilityScores({ C, sheet, onRoll }) {
  const pb = getPB(C);
  const profSets = useProficiencySets();
  const armorPenalties = getEquippedArmorPenalties(C, sheet?.sheetInventory || C?.inventory || [], profSets);
  const activeConditions = sheet?.activeConditions || [];

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
          const shownMod = effectiveD20Modifier(mod, sheet?.exhaustionLevel);
          const armorDisadv = armorPenalties.hasPenalty && armorPenalties.disadvantageOn.includes(`${s}-checks`);
          const checkDisadv = describeCheckDisadvantage(activeConditions, armorDisadv);
          const { conditional } = checkDisadv;
          const hasDisadv = checkDisadv.has;
          const disadvReason = checkDisadv.reason;
          const condNotes = conditional.map((c) => `${c.source} (${c.note})`);
          const situational = condNotes.length ? ` • Situational: ${condNotes.join('; ')}` : '';
          // Solid disadvantage drives the roll; a purely situational one is a
          // hint only.
          const visual = hasDisadv
            ? advantageVisual(false, true)
            : (condNotes.length ? conditionalDisadvantageVisual() : null);
          const tooltipText = hasDisadv
            ? `Disadvantage: ${disadvReason}${situational}`
            : `Situational disadvantage: ${condNotes.join('; ')}`;
          const advArg = hasDisadv ? false : undefined;
          return (
            <RollModeArea key={s} onClick={() => onRoll(mod, FULL_LBL[s] + ' Check', advArg)}
              sources={{ adv: false, disadv: hasDisadv }}
              onPick={(picked) => onRoll(mod, FULL_LBL[s] + ' Check', picked)}
              sx={{
                bgcolor: 'background.paper', border: 1, borderColor: advArg === false ? 'warning.main' : 'divider', borderRadius: 1,
                display: 'flex', flexDirection: 'column', alignItems: 'center', p: '0.4rem 0.25rem',
                cursor: 'pointer', transition: 'border-color 0.15s',
                '&:hover': { borderColor: 'primary.main' },
              }}>
              <Typography sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.14em', color: 'text.secondary', textTransform: 'uppercase', mb: 0.1 }}>
                {SLBL[s]}
              </Typography>
              <Typography sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '1.5rem', fontWeight: 700, color: '#edd48a', lineHeight: 1 }}>
                {fbonus(shownMod)}
              </Typography>
              <Box sx={{
                fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.56rem', fontWeight: 600, color: 'text.secondary',
                bgcolor: 'rgba(35,32,26,1)', border: 1, borderColor: 'divider', borderRadius: '50%',
                width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 0.25,
              }}>
                {val}
              </Box>
              {visual ? (
                <Tooltip title={tooltipText}>
                  <visual.Icon size={12} style={{ color: visual.color, marginTop: '2px' }} />
                </Tooltip>
              ) : null}
            </RollModeArea>
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
