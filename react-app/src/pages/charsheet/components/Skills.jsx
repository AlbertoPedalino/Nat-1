import { Box, Paper, Typography, Tooltip } from '@mui/material';
import { advantageVisual, conditionalDisadvantageVisual } from './advantageMark.jsx';
import { SKILLS, getSkillTraining, getSkillBonus, fbonus, SLBL, effectiveD20Modifier } from '../logic/calculations.js';
import { describeCheckDisadvantage } from '../../../shared/character/conditions.js';
import { getEquippedArmorPenalties } from '../logic/armorPenalties.js';
import { getSkillAdvantageFromEffects } from '../logic/sheetEffects.js';
import { useProficiencySets } from '../context/ProficiencySetsContext.jsx';
import { aggregateAbilityCheckBonus } from '../../../shared/character/itemBonus.js';
import { getItemAdvantageOnSkill } from '../../../shared/character/itemEffects.js';
import { isWildShaped, itemEffectInventory } from '../../../shared/character/wildShapeForm.js';

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
function getSkillAdvantage(C, skillName, shaped = false) {
  const fromEffects = getSkillAdvantageFromEffects(C, skillName);
  if (fromEffects) return fromEffects;
  if (shaped) return null; // item-granted advantages merge away while Wild Shaped
  const fromItem = getItemAdvantageOnSkill(C, skillName);
  if (fromItem && fromItem.length) return { source: fromItem[0] };
  return null;
}

export default function Skills({ C, sheet, onRoll }) {
  const profSets = useProficiencySets();
  const inventory = sheet?.sheetInventory || C?.inventory || [];
  // Wild Shape: equipment merges into the form (no effect), so item check bonuses
  // and armor penalties (you're not wearing the armor) are suppressed; `shaped`
  // also drops item-granted skill advantages below.
  const shaped = isWildShaped(C);
  const effectInventory = itemEffectInventory(C, inventory);
  const armorPenalties = getEquippedArmorPenalties(C, effectInventory, profSets);
  const itemCheckBonus = aggregateAbilityCheckBonus(effectInventory);
  const activeConditions = sheet?.activeConditions || [];

  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      <Box sx={{ bgcolor: 'rgba(35,32,26,1)', borderBottom: 1, borderColor: 'divider', px: '0.8rem', py: '0.48rem', borderLeft: 3, borderLeftColor: 'primary.main' }}>
        <Typography sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'primary.main' }}>
          Skills
        </Typography>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: '20px 30px 1fr auto', gap: '4px', px: '0.9rem', pt: '0.3rem', pb: '0.3rem', fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'text.secondary' }}>
        <span></span>
        <span>Prof.</span>
        <span>Skill</span>
        <span>Mod.</span>
      </Box>
      {SKILLS.map(sk => {
        const training = getSkillTraining(C, sk.n);
        const bonus = getSkillBonus(C, sk) + itemCheckBonus;
        const shownBonus = effectiveD20Modifier(bonus, sheet?.exhaustionLevel);
        const isStealth = String(sk.n || '').toLowerCase() === 'stealth';
        const armorDisadv = armorPenalties.hasPenalty && (
          armorPenalties.disadvantageOn.includes(`${sk.a}-checks`)
          || (isStealth && armorPenalties.disadvantageOn.includes('dex-stealth'))
        );
        const { has: hasDisadv, reason: disadvReason, conditional } = describeCheckDisadvantage(activeConditions, armorDisadv);
        const condNotes = conditional.map((c) => `${c.source} (${c.note})`);
        const situational = condNotes.length ? ` • Situational: ${condNotes.join('; ')}` : '';
        const hasAdv = getSkillAdvantage(C, sk.n, shaped);
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
          <Box key={sk.n} onClick={() => {
            const withAdv = hasAdv && !hasDisadv;
            const withDis = hasDisadv && !hasAdv;
            onRoll(sk.n, bonus, withAdv ? { advantage: true } : withDis ? { disadvantage: true } : {});
          }}
            sx={{ display: 'grid', gridTemplateColumns: '20px 30px 1fr auto', gap: '4px', px: '0.9rem', py: '3px', alignItems: 'center', cursor: 'pointer', transition: 'background 0.1s', '&:hover': { bgcolor: 'rgba(202,165,80,0.05)' } }}>
            <Box />
            <SkillProficiencyDot training={training} />
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
              {sk.n}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.5rem', color: 'text.secondary', letterSpacing: '0.06em' }}>
                {SLBL[sk.a]}
              </Typography>
              <Typography sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.75rem', fontWeight: 600, color: 'text.primary', textAlign: 'right' }}>
                {fbonus(shownBonus)}
              </Typography>
              {visual && (
                <Tooltip title={skillTooltip}>
                  <visual.Icon size={11} style={{ color: visual.color, marginLeft: '2px' }} />
                </Tooltip>
              )}
            </Box>
          </Box>
        );
      })}
    </Paper>
  );
}
