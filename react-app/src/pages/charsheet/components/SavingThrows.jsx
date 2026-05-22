import { useState } from 'react';
import { Box, Paper, Typography, Tooltip, Menu, MenuItem } from '@mui/material';
import { Dice5, AlertCircle, Sparkles, ChevronDown } from 'lucide-react';
import { STATS, SLBL, FULL_LBL, hasSaveProficiency, getSaveBonus, fbonus } from '../logic/calculations.js';
import { getEquippedArmorPenalties } from '../logic/armorPenalties.js';
import { installedRegistry } from '../../../adapters/index.js';
import { getConcentrationBonus } from '../logic/sheetEffects.js';
import { useProficiencySets } from '../context/ProficiencySetsContext.jsx';
import { aggregateSavingThrowBonus } from '../../../shared/character/itemBonus.js';
import { collectItemEffects } from '../../../shared/character/itemEffects.js';


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
  const inventory = sheet?.sheetInventory || C?.inventory || [];
  const armorPenalties = getEquippedArmorPenalties(C, inventory, profSets);
  const itemSaveBonus = aggregateSavingThrowBonus(inventory);
  const itemEffects = collectItemEffects(C?.inventory);
  const saveContexts = [...itemEffects.advantageOnSaveAgainst.entries()];

  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuStat, setMenuStat] = useState(null);
  const [menuOptions, setMenuOptions] = useState({ hasDisadv: false, baseAdv: false });

  const handleSaveClick = (event, st, hasDisadv, baseAdv) => {
    if (saveContexts.length === 0) {
      onRoll(st, { disadvantage: hasDisadv || undefined, advantage: baseAdv && !hasDisadv || undefined });
      return;
    }
    setMenuAnchor(event.currentTarget);
    setMenuStat(st);
    setMenuOptions({ hasDisadv, baseAdv });
  };

  const handleMenuPick = (context) => {
    if (!menuStat) { setMenuAnchor(null); return; }
    const advFromContext = context && context !== 'none';
    const adv = (advFromContext || menuOptions.baseAdv) && !menuOptions.hasDisadv;
    onRoll(menuStat, { disadvantage: menuOptions.hasDisadv || undefined, advantage: adv || undefined });
    setMenuAnchor(null);
    setMenuStat(null);
  };

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
          const bonus = getSaveBonus(C, st) + itemSaveBonus;
          const prof = hasSaveProficiency(C, st);
          const hasDisadv = armorPenalties.hasPenalty && armorPenalties.disadvantageOn.includes(`${st}-saves`);
          const saveEffects = collectSaveEffects(C, st);
          const hasAdv = saveEffects.some((effect) => effect.type === 'advantage');
          const tooltipText = hasDisadv ? 'Disadvantage from armor' : hasAdv ? saveEffects.map((effect) => effect.note).filter(Boolean).join(' • ') || 'Advantage' : '';
          const hasContextMenu = saveContexts.length > 0;

          return (
            <Box key={st} onClick={(e) => handleSaveClick(e, st, hasDisadv, hasAdv)}
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
              {hasContextMenu ? (
                <Tooltip title="Click to pick save context (vs spell / vs poison / etc.)">
                  <ChevronDown size={12} style={{ color: '#edd48a', flexShrink: 0, opacity: 0.6 }} />
                </Tooltip>
              ) : null}
            </Box>
          );
        })}
      </Box>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}
        slotProps={{ paper: { sx: { bgcolor: 'rgba(26,23,19,0.98)', border: 1, borderColor: 'divider' } } }}>
        <MenuItem onClick={() => handleMenuPick('none')} sx={{ fontSize: '0.75rem' }}>
          Normal save
        </MenuItem>
        {saveContexts.map(([target, sources]) => (
          <MenuItem key={target} onClick={() => handleMenuPick(target)} sx={{ fontSize: '0.75rem', color: '#70b7a6' }}>
            vs {target} — Advantage
            <Typography sx={{ ml: 1, fontSize: '0.6rem', color: 'text.secondary', fontStyle: 'italic' }}>
              ({sources.join(', ')})
            </Typography>
          </MenuItem>
        ))}
      </Menu>
    </Paper>
  );
}
