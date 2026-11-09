import { useState } from 'react';
import { Box, Paper, Typography, Tooltip, Menu, MenuItem } from '@mui/material';
import { Dice5, Sparkles, ChevronDown } from 'lucide-react';
import { hasSaveProficiency, getSaveBonus, effectiveD20Modifier } from '../../../shared/character/sheet/sheetStats.js';
import { getConcentrationBonus, getD20FloorReminders } from '../../../shared/character/sheet/effectBonuses.js';
import { useProficiencySets } from '../proficiency/ProficiencySetsContext.jsx';
import { characterItemBonuses } from '../../../shared/character/inventory/itemBonus.js';
import { characterItemEffects } from '../../../shared/character/inventory/itemEffects.js';
import {
  collectSaveModifiers,
  fixedModifiersForAbility,
  summarizeSaveModifiers,
} from './saveModifiers.js';
import { advantageVisual, autoFailVisual } from './advantageMark.jsx';
import RollModeArea from '../../../shared/character/dice/RollModeArea.jsx';
import { signed } from '../../../shared/ui/numberFormat.js';
import { UI_COLORS, uiAlpha } from '../../../shared/ui/colors.js';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import PanelHeader from '../../../shared/ui/PanelHeader.jsx';
import { ABILITIES, ABILITY_ABBREVIATIONS, ABILITY_NAMES } from '../../../shared/content/rulesVocabulary.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';

export default function SavingThrows({ C, sheet, onRoll }) {
  const profSets = useProficiencySets();
  // Item bonuses, advantages and armor penalties already leave out merged
  // equipment while Wild Shaped; feature and condition modifiers stay.
  const inventory = sheet?.sheetInventory || C?.inventory || [];
  const itemSaveBonus = characterItemBonuses(C, inventory).savingThrow;
  const itemEffects = characterItemEffects(C);
  const saveContexts = [...itemEffects.advantageOnSaveAgainst.entries()];
  const saveModifiers = collectSaveModifiers(C, inventory, profSets, sheet?.activeConditions || []);
  // Reminder list shows only situational modifiers (e.g. "vs Frightened").
  // Fixed ones (e.g. Gnomish Cunning on INT/WIS/CHA, armor) are already
  // surfaced per-stat (icon + auto-roll), so they're excluded here.
  const modifierRows = summarizeSaveModifiers(saveModifiers.filter((m) => m.mode === 'conditional'));
  // Concentration bonus (e.g. Bladesong) applies only to Concentration saves,
  // not every CON save, so it's surfaced as a situational reminder rather than
  // an icon on the CON stat row.
  const concentrationBonus = getConcentrationBonus(C);
  // Active d20-floor reminders (e.g. Stars Druid Dragon constellation) — shown
  // here because they cover Concentration saves.
  const d20FloorReminders = getD20FloorReminders(C);

  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuStat, setMenuStat] = useState(null);
  const [menuOptions, setMenuOptions] = useState({ hasDisadv: false, baseAdv: false });

  // Any advantage plus any disadvantage is a straight roll, whatever the count.
  const rollOptions = (adv, disadv) => ({
    advantage: (adv && !disadv) || undefined,
    disadvantage: (disadv && !adv) || undefined,
  });

  const handleSaveClick = (event, st, hasDisadv, baseAdv) => {
    if (saveContexts.length === 0) {
      onRoll(st, rollOptions(baseAdv, hasDisadv));
      return;
    }
    setMenuAnchor(event.currentTarget);
    setMenuStat(st);
    setMenuOptions({ hasDisadv, baseAdv });
  };

  const handleMenuPick = (context) => {
    if (!menuStat) { setMenuAnchor(null); return; }
    const advFromContext = context && context !== 'none';
    onRoll(menuStat, rollOptions(advFromContext || menuOptions.baseAdv, menuOptions.hasDisadv));
    setMenuAnchor(null);
    setMenuStat(null);
  };

  return (
    <Paper variant="outlined" sx={{ mb: '0.6rem', overflow: 'hidden' }}>
      <PanelHeader icon={Dice5} title="Saving Throws" />
      <Box sx={{ p: '0.55rem 0.8rem' }}>
        {ABILITIES.map(st => {
          const bonus = getSaveBonus(C, st) + itemSaveBonus;
          const shownBonus = effectiveD20Modifier(bonus, sheet?.exhaustionLevel);
          const prof = hasSaveProficiency(C, st);
          const fixedMods = fixedModifiersForAbility(saveModifiers, st);
          const hasDisadv = fixedMods.some((m) => m.kind === 'disadvantage');
          const hasAdv = fixedMods.some((m) => m.kind === 'advantage');
          const tooltipText = fixedMods.map((m) => `${m.kind === 'advantage' ? 'Advantage' : 'Disadvantage'}: ${m.source}`).join(' • ');
          const visual = advantageVisual(hasAdv, hasDisadv);
          const hasContextMenu = saveContexts.length > 0;

          return (
            <RollModeArea key={st} onClick={(e) => handleSaveClick(e, st, hasDisadv, hasAdv)}
              sources={{ adv: hasAdv, disadv: hasDisadv }}
              onPick={(advArg) => onRoll(st, { advantage: advArg === true || undefined, disadvantage: advArg === false || undefined })}
              sx={{ display: 'flex', alignItems: 'center', gap: 1, py: '3px', cursor: 'pointer', borderRadius: 1, '&:hover': { bgcolor: uiAlpha(UI_COLORS.accent, 0.04) } }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, transition: 'all 0.1s', border: 1, borderColor: 'divider', bgcolor: prof ? 'primary.main' : 'transparent' }} />
              <Typography sx={{ ...TEXT_STYLES.title, fontSize: FONT_SIZES.xs, color: 'text.secondary', width: 28, flexShrink: 0 }}>
                {ABILITY_ABBREVIATIONS[st]}
              </Typography>
              <Typography sx={{ fontSize: FONT_SIZES.lg, color: 'text.secondary' }}>
                {ABILITY_NAMES[st]}
              </Typography>
              <Typography sx={{ ...TEXT_STYLES.figure, fontSize: FONT_SIZES.lg, color: 'text.primary', ml: 'auto' }}>
                {signed(shownBonus)}
              </Typography>
              {visual && (
                <Tooltip title={tooltipText}>
                  <visual.Icon size={12} style={{ color: visual.color, flexShrink: 0 }} />
                </Tooltip>
              )}
              {hasContextMenu ? (
                <Tooltip title="Click to pick save context (vs spell / vs poison / etc.)">
                  <ChevronDown size={12} style={{ color: UI_COLORS.accentText, flexShrink: 0, opacity: 0.6 }} />
                </Tooltip>
              ) : null}
            </RollModeArea>
          );
        })}
      </Box>

      {(modifierRows.length > 0 || concentrationBonus > 0 || d20FloorReminders.length > 0) && (
        <Box sx={{ borderTop: 1, borderColor: 'divider', px: '0.8rem', py: '0.5rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {d20FloorReminders.map((r, i) => (
            <Box key={`d20floor-${i}`} sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75 }}>
              <Dice5 size={13} style={{ color: UI_COLORS.accentMuted, flexShrink: 0, marginTop: 2 }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                  <Typography component="span" sx={{ fontSize: FONT_SIZES.md, color: UI_COLORS.accentMuted, fontWeight: 700, flexShrink: 0 }}>
                    Min {r.minRoll}
                  </Typography>
                  <Typography component="span" sx={{ fontSize: FONT_SIZES.md, color: 'text.primary' }}>
                    Concentration saves (treat d20 of {r.minRoll - 1} or lower as {r.minRoll})
                  </Typography>
                </Box>
                {r.note && (
                  <Typography sx={{ ...TEXT_STYLES.note, fontSize: FONT_SIZES.xs, mt: '1px' }}>
                    {r.note}
                  </Typography>
                )}
              </Box>
            </Box>
          ))}
          {concentrationBonus > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75 }}>
              <Sparkles size={13} style={{ color: UI_COLORS.secondary, flexShrink: 0, marginTop: 2 }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                  <Typography component="span" sx={{ fontSize: FONT_SIZES.md, color: UI_COLORS.secondary, fontWeight: 700, flexShrink: 0 }}>
                    +{concentrationBonus}
                  </Typography>
                  <Typography component="span" sx={{ fontSize: FONT_SIZES.md, color: 'text.primary' }}>
                    Concentration saves
                  </Typography>
                </Box>
                <Typography sx={{ ...TEXT_STYLES.note, fontSize: FONT_SIZES.xs, mt: '1px' }}>
                  Bladesong
                </Typography>
              </Box>
            </Box>
          )}
          {modifierRows.map((mod, i) => {
            const adv = mod.kind === 'advantage';
            const visual = mod.kind === 'autofail' ? autoFailVisual() : advantageVisual(adv, !adv);
            const { Icon, color, label: kindLabel } = visual;
            return (
              <Box key={`${mod.label}-${mod.source}-${i}`} sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75 }}>
                <Icon size={13} style={{ color, flexShrink: 0, marginTop: 2 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                    <Typography component="span" sx={{ fontSize: FONT_SIZES.md, color, fontWeight: 700, flexShrink: 0 }}>
                      {kindLabel}
                    </Typography>
                    <Typography component="span" sx={{ fontSize: FONT_SIZES.md, color: 'text.primary' }}>
                      {mod.label}
                    </Typography>
                  </Box>
                  <Typography sx={{ ...TEXT_STYLES.note, fontSize: FONT_SIZES.xs, mt: '1px' }}>
                    {mod.source}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}
        slotProps={{ paper: { sx: { bgcolor: uiAlpha(UI_COLORS.surfaceDeep, 0.98), border: 1, borderColor: 'divider' } } }}>
        <MenuItem onClick={() => handleMenuPick('none')} sx={{ fontSize: FONT_SIZES.lg }}>
          Normal save
        </MenuItem>
        {saveContexts.map(([target, sources]) => (
          <MenuItem key={target} onClick={() => handleMenuPick(target)} sx={{ fontSize: FONT_SIZES.lg, color: UI_COLORS.secondary }}>
            vs {target} — Advantage
            <Typography sx={{ ...TEXT_STYLES.note, ml: 1, fontSize: FONT_SIZES.xs }}>
              ({sources.join(', ')})
            </Typography>
          </MenuItem>
        ))}
      </Menu>
    </Paper>
  );
}
