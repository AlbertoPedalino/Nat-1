import { Box, Paper, Typography, Tooltip } from '@mui/material';
import { advantageVisual, conditionalDisadvantageVisual } from './advantageMark.jsx';
import RollModeArea from '../../../shared/character/dice/RollModeArea.jsx';
import { getSkillTraining, getSkillBonus, effectiveD20Modifier } from '../../../shared/character/sheet/sheetStats.js';
import { describeCheckDisadvantage } from '../../../shared/character/combat/conditions.js';
import { getEquippedArmorPenalties } from '../inventory/armorPenalties.js';
import { getSkillAdvantageFromEffects } from '../../../shared/character/sheet/effectBonuses.js';
import { useProficiencySets } from '../proficiency/ProficiencySetsContext.jsx';
import { characterItemBonuses } from '../../../shared/character/inventory/itemBonus.js';
import { getItemAdvantageOnSkill } from '../../../shared/character/inventory/itemEffects.js';
import { signed } from '../../../shared/ui/numberFormat.js';
import { UI_COLORS, uiAlpha } from '../../../shared/ui/colors.js';
import { UI_FONTS } from '../../../shared/ui/fonts.js';
import PanelHeader, { sectionLabelSx } from '../../../shared/ui/PanelHeader.jsx';
import { ABILITY_ABBREVIATIONS, SKILLS } from '../../../shared/content/rulesVocabulary.js';

function SkillProficiencyDot({ training }) {
  const dotColor = training === 'exp' ? 'secondary.main' : training ? 'primary.main' : 'divider';

  return (
    <Box
      sx={{
        width: 9,
        height: 9,
        borderRadius: '50%',
        border: 1,
        borderColor: dotColor,
        bgcolor: training === 'prof' || training === 'exp' ? dotColor : 'transparent',
        background: training === 'half'
          ? (theme) => `linear-gradient(90deg, ${theme.palette.primary.main} 50%, transparent 50%)`
          : undefined,
      }}
    />
  );
}

// Skill advantage from two domains: sheet effects (class/subclass/species/feat,
// already gated by minLevel/condition/requiredChoice/requiredItemFlag) and
// magic items. Adding a source = register a `{ type:'advantage', target:'skill',
// skill }` sheet effect in its adapter; nothing here changes.
function getSkillAdvantage(C, skillName) {
  const fromEffects = getSkillAdvantageFromEffects(C, skillName);
  if (fromEffects) return fromEffects;
  const fromItem = getItemAdvantageOnSkill(C, skillName);
  if (fromItem && fromItem.length) return { source: fromItem[0] };
  return null;
}

export default function Skills({ C, sheet, onRoll }) {
  const profSets = useProficiencySets();
  const inventory = sheet?.sheetInventory || C?.inventory || [];
  // Item bonuses, advantages and armor penalties already leave out merged
  // equipment while Wild Shaped.
  const armorPenalties = getEquippedArmorPenalties(C, inventory, profSets);
  const itemCheckBonus = characterItemBonuses(C, inventory).abilityCheck;
  const activeConditions = sheet?.activeConditions || [];

  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      <PanelHeader title="Skills" />
      <Box sx={{ display: 'grid', gridTemplateColumns: '20px 30px 1fr auto', gap: '4px', px: '0.9rem', pt: '0.3rem', pb: '0.3rem', ...sectionLabelSx, color: 'text.secondary' }}>
        <span></span>
        <span>Prof.</span>
        <span>Skill</span>
        <span>Mod.</span>
      </Box>
      {SKILLS.map(sk => {
        const training = getSkillTraining(C, sk.name);
        const bonus = getSkillBonus(C, sk.name) + itemCheckBonus;
        const shownBonus = effectiveD20Modifier(bonus, sheet?.exhaustionLevel);
        const isStealth = String(sk.name || '').toLowerCase() === 'stealth';
        const armorDisadv = armorPenalties.hasPenalty && (
          armorPenalties.disadvantageOn.includes(`${sk.ability}-checks`)
          || (isStealth && armorPenalties.disadvantageOn.includes('dex-stealth'))
        );
        const checkDisadv = describeCheckDisadvantage(activeConditions, armorDisadv);
        const { conditional } = checkDisadv;
        const hasDisadv = checkDisadv.has;
        const disadvReason = checkDisadv.reason;
        const condNotes = conditional.map((c) => `${c.source} (${c.note})`);
        const situational = condNotes.length ? ` • Situational: ${condNotes.join('; ')}` : '';
        const hasAdv = getSkillAdvantage(C, sk.name);
        const hasBoth = hasAdv && hasDisadv;
        // Solid adv/disadv drive the roll; a purely situational disadvantage is a hint only.
        const visual = (hasAdv || hasDisadv)
          ? advantageVisual(!!hasAdv, hasDisadv)
          : (condNotes.length ? conditionalDisadvantageVisual() : null);
        const skillTooltip = hasBoth
          ? `Advantage and Disadvantage cancel${situational}`
          : hasAdv ? `Advantage (${hasAdv.source})${situational}`
          : hasDisadv ? `Disadvantage: ${disadvReason}${situational}`
          : `Situational disadvantage: ${condNotes.join('; ')}`;

        return (
          <RollModeArea key={sk.name} onClick={() => {
            const withAdv = hasAdv && !hasDisadv;
            const withDis = hasDisadv && !hasAdv;
            onRoll(sk.name, bonus, withAdv ? { advantage: true } : withDis ? { disadvantage: true } : {});
          }}
            sources={{ adv: Boolean(hasAdv), disadv: hasDisadv }}
            onPick={(advArg) => onRoll(sk.name, bonus, advArg === true ? { advantage: true } : advArg === false ? { disadvantage: true } : {})}
            sx={{ display: 'grid', gridTemplateColumns: '20px 30px 1fr auto', gap: '4px', px: '0.9rem', py: '3px', alignItems: 'center', cursor: 'pointer', transition: 'background 0.1s', '&:hover': { bgcolor: uiAlpha(UI_COLORS.gold, 0.05) } }}>
            <Box />
            <SkillProficiencyDot training={training} />
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
              {sk.name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography sx={{ fontFamily: UI_FONTS.display, fontSize: '0.5rem', color: 'text.secondary', letterSpacing: '0.06em' }}>
                {ABILITY_ABBREVIATIONS[sk.ability]}
              </Typography>
              <Typography sx={{ fontFamily: UI_FONTS.display, fontSize: '0.75rem', fontWeight: 600, color: 'text.primary', textAlign: 'right' }}>
                {signed(shownBonus)}
              </Typography>
              {visual && (
                <Tooltip title={skillTooltip}>
                  <visual.Icon size={11} style={{ color: visual.color, marginLeft: '2px' }} />
                </Tooltip>
              )}
            </Box>
          </RollModeArea>
        );
      })}
    </Paper>
  );
}
