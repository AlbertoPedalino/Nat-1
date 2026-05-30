import { useState } from 'react';
import { Box, Paper, Typography, Tooltip, Menu, MenuItem } from '@mui/material';
import { Dice5, Sparkles, ChevronDown } from 'lucide-react';
import { STATS, SLBL, FULL_LBL, hasSaveProficiency, getSaveBonus, fbonus } from '../logic/calculations.js';
import { getConcentrationBonus } from '../logic/sheetEffects.js';
import { useProficiencySets } from '../context/ProficiencySetsContext.jsx';
import { aggregateSavingThrowBonus } from '../../../shared/character/itemBonus.js';
import { collectItemEffects } from '../../../shared/character/itemEffects.js';
import { collectSaveModifiers, fixedModifiersForAbility, summarizeSaveModifiers } from '../logic/saveModifiers.js';
import { advantageVisual } from './advantageMark.jsx';

export default function SavingThrows({ C, sheet, onRoll }) {
  const profSets = useProficiencySets();
  const inventory = sheet?.sheetInventory || C?.inventory || [];
  const itemSaveBonus = aggregateSavingThrowBonus(inventory);
  const itemEffects = collectItemEffects(C?.inventory);
  const saveContexts = [...itemEffects.advantageOnSaveAgainst.entries()];
  const saveModifiers = collectSaveModifiers(C, inventory, profSets);
  // Reminder list shows only situational modifiers (e.g. "vs Frightened").
  // Fixed ones (e.g. Gnomish Cunning on INT/WIS/CHA, armor) are already
  // surfaced per-stat (icon + auto-roll), so they're excluded here.
  const modifierRows = summarizeSaveModifiers(saveModifiers.filter((m) => m.mode === 'conditional'));

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
          const fixedMods = fixedModifiersForAbility(saveModifiers, st);
          const hasDisadv = fixedMods.some((m) => m.kind === 'disadvantage');
          const hasAdv = fixedMods.some((m) => m.kind === 'advantage');
          const tooltipText = fixedMods.map((m) => `${m.kind === 'advantage' ? 'Advantage' : 'Disadvantage'}: ${m.source}`).join(' • ');
          const visual = advantageVisual(hasAdv, hasDisadv);
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
              {visual && (
                <Tooltip title={tooltipText}>
                  <visual.Icon size={12} style={{ color: visual.color, flexShrink: 0 }} />
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

      {modifierRows.length > 0 && (
        <Box sx={{ borderTop: 1, borderColor: 'divider', px: '0.8rem', py: '0.5rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {modifierRows.map((mod, i) => {
            const adv = mod.kind === 'advantage';
            const { Icon, color } = advantageVisual(adv, !adv);
            return (
              <Box key={`${mod.label}-${mod.source}-${i}`} sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75 }}>
                <Icon size={13} style={{ color, flexShrink: 0, marginTop: 2 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                    <Typography component="span" sx={{ fontSize: '0.7rem', color, fontWeight: 700, flexShrink: 0 }}>
                      {adv ? 'Adv' : 'Disadv'}
                    </Typography>
                    <Typography component="span" sx={{ fontSize: '0.7rem', color: 'text.primary' }}>
                      {mod.label}
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary', fontStyle: 'italic', mt: '1px' }}>
                    {mod.source}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

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
