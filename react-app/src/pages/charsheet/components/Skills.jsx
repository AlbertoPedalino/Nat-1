import { Box, Paper, Typography, Tooltip } from '@mui/material';
import { AlertCircle, Sparkles } from 'lucide-react';
import { SKILLS, getSkillTraining, getSkillBonus, fbonus, SLBL } from '../logic/calculations.js';
import { getEquippedArmorPenalties } from '../logic/armorPenalties.js';
import { matchesChoiceRequirement, inventoryHasFlag } from '../../../shared/character/choiceUtils.js';
import { getSkillAdvantageFromEffects } from '../logic/sheetEffects.js';
import { useProficiencySets } from '../context/ProficiencySetsContext.jsx';
import { aggregateAbilityCheckBonus } from '../../../shared/character/itemBonus.js';
import { getItemAdvantageOnSkill } from '../../../shared/character/itemEffects.js';

const _SKILL_ADVANTAGES = [
  {
    skill: 'stealth',
    label: 'Dampening Field',
    requiresChoice: { key: 'armorer_model', value: 'infiltrator' },
    requiresInventoryFlag: { flag: 'arcaneArmor', itemType: ['LA', 'MA', 'HA'], equipped: true },
  },
];


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

function getSkillAdvantage(C, skillName) {
  const inv = C?.inventory || [];
  const s = String(skillName || '').toLowerCase();
  for (const config of _SKILL_ADVANTAGES) {
    if (config.skill !== s) continue;
    if (config.requiresChoice && !matchesChoiceRequirement(C, config.requiresChoice)) continue;
    if (config.requiresInventoryFlag && !inventoryHasFlag(inv, config.requiresInventoryFlag)) continue;
    return { source: config.label };
  }
  const fromEffects = getSkillAdvantageFromEffects(C, skillName);
  if (fromEffects) return fromEffects;
  const fromItem = getItemAdvantageOnSkill(C, skillName);
  if (fromItem && fromItem.length) return { source: fromItem[0] };
  return null;
}

export default function Skills({ C, sheet, onRoll }) {
  const profSets = useProficiencySets();
  const inventory = sheet?.sheetInventory || C?.inventory || [];
  const armorPenalties = getEquippedArmorPenalties(C, inventory, profSets);
  const itemCheckBonus = aggregateAbilityCheckBonus(inventory);
  
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
        const isStealth = String(sk.n || '').toLowerCase() === 'stealth';
        const hasDisadv = armorPenalties.hasPenalty && (
          armorPenalties.disadvantageOn.includes(`${sk.a}-checks`)
          || (isStealth && armorPenalties.disadvantageOn.includes('dex-stealth'))
        );
        const hasAdv = getSkillAdvantage(C, sk.n);
        const hasBoth = hasAdv && hasDisadv;
        
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
                {fbonus(bonus)}
              </Typography>
              {hasAdv && (
                <Tooltip title={hasBoth ? 'Advantage and Disadvantage cancel' : `Advantage (${hasAdv.source})`}>
                  <Sparkles size={10} style={{ color: hasBoth ? '#c4b393' : '#58b879', marginLeft: '2px' }} />
                </Tooltip>
              )}
              {hasDisadv && !hasAdv && (
                <Tooltip title="Disadvantage from armor">
                  <AlertCircle size={10} style={{ color: '#ff9800', marginLeft: '2px' }} />
                </Tooltip>
              )}
            </Box>
          </Box>
        );
      })}
    </Paper>
  );
}
