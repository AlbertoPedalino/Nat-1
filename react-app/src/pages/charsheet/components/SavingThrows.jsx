import { Box, Paper, Typography, Tooltip } from '@mui/material';
import { Dice5, AlertCircle, Sparkles } from 'lucide-react';
import { STATS, SLBL, FULL_LBL, hasSaveProficiency, getSaveBonus, fbonus } from '../logic/calculations.js';
import { getEquippedArmorPenalties } from '../logic/armorPenalties.js';
import { installedRegistry } from '../../../adapters/index.js';
import { getConcentrationBonus } from '../logic/sheetEffects.js';
import { useProficiencySets } from '../context/ProficiencySetsContext.jsx';


function collectSaveEffects(C, stat) {
  const out = [];
  const push = (list, ownerLevel) => {
    (list || []).forEach((effect) => {
      if (!effect) return;
      if (effect.minLevel && Number(ownerLevel || 1) < Number(effect.minLevel)) return;
      if (effect.target !== 'save') return;
      if (effect.ability && String(effect.ability).toLowerCase() !== String(stat).toLowerCase()) return;
      if (typeof effect.condition === 'function') {
        try { if (!effect.condition(C)) return; } catch { return; }
      }
      out.push(effect);
    });
  };
  const primaryLevel = Number(C?.classLevel || C?.level || 1);
  push(installedRegistry.getClassSheetEffects(C?.className), primaryLevel);
  push(installedRegistry.getSubclassSheetEffects(C?.className, C?.subclassShortName), primaryLevel);
  (C?.extraClasses || []).forEach((extra) => {
    const level = Number(extra?.level || 1);
    push(installedRegistry.getClassSheetEffects(extra?.name), level);
    push(installedRegistry.getSubclassSheetEffects(extra?.name, extra?.subclassShortName), level);
  });
  return out;
}

export default function SavingThrows({ C, sheet, onRoll }) {
  const profSets = useProficiencySets();
  const armorPenalties = getEquippedArmorPenalties(C, sheet?.sheetInventory || C?.inventory || [], profSets);
  
  return (
    <Paper variant="outlined" sx={{ mb: '0.6rem', overflow: 'hidden' }}>
      <Box sx={{ bgcolor: 'rgba(35,32,26,1)', borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1, px: '0.8rem', py: '0.48rem', borderLeft: 3, borderLeftColor: 'primary.main' }}>
        <Dice5 size={14} />
        <Typography sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'primary.main' }}>
          Saving Throws
        </Typography>
      </Box>
      <Box sx={{ p: '0.55rem 0.8rem' }}>
        {STATS.map(st => {
          const bonus = getSaveBonus(C, st);
          const prof = hasSaveProficiency(C, st);
          const hasDisadv = armorPenalties.hasPenalty && armorPenalties.disadvantageOn.includes(`${st}-saves`);
          const saveEffects = collectSaveEffects(C, st);
          const hasAdv = saveEffects.some((effect) => effect.type === 'advantage');
          const tooltipText = hasDisadv ? 'Disadvantage from armor' : hasAdv ? saveEffects.map((effect) => effect.note).filter(Boolean).join(' • ') || 'Advantage' : '';
          
          return (
            <Box key={st} onClick={() => onRoll(st, { disadvantage: hasDisadv || undefined, advantage: hasAdv && !hasDisadv || undefined })}
              sx={{ display: 'flex', alignItems: 'center', gap: 1, py: '3px', cursor: 'pointer', borderRadius: 1, '&:hover': { bgcolor: 'rgba(202,165,80,0.04)' } }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, transition: 'all 0.1s', border: 1, borderColor: 'divider', bgcolor: prof ? 'primary.main' : 'transparent' }} />
              <Typography sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.625rem', fontWeight: 600, color: 'text.secondary', letterSpacing: '0.08em', width: 28, flexShrink: 0 }}>
                {SLBL[st]}
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                {FULL_LBL[st]}
              </Typography>
              <Typography sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.75rem', fontWeight: 600, color: 'text.primary', ml: 'auto' }}>
                {fbonus(bonus)}
                {st === 'con' && getConcentrationBonus(C) > 0 ? (
                  <Tooltip title={`Concentration saves: +${getConcentrationBonus(C)} (Bladesong)`}>
                    <Sparkles size={11} style={{ color: '#70b7a6', marginLeft: 4, verticalAlign: 'middle', cursor: 'help' }} />
                  </Tooltip>
                ) : null}
              </Typography>
              {(hasDisadv || hasAdv) && (
                <Tooltip title={tooltipText}>
                  <AlertCircle size={12} style={{ color: hasDisadv ? '#ff9800' : '#70b7a6', flexShrink: 0 }} />
                </Tooltip>
              )}
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
}
