import { Box, Paper, Typography } from '@mui/material';
import { Eye } from 'lucide-react';
import { getSkillBonus } from '../logic/calculations.js';
import { collectSenseEffects, effectSummary, effectTitle } from '../logic/sheetEffects.js';
import { getItemSenses } from '../../../shared/character/itemEffects.js';

const SENSE_LABELS = {
  darkvision: 'Darkvision',
  devilsSight: "Devil's Sight",
  blindsight: 'Blindsight',
  truesight: 'Truesight',
  tremorsense: 'Tremorsense',
};

function isDarkvisionEffect(effect) {
  const type = String(effect?.type || '').toLowerCase();
  const sense = String(effect?.senseType || '').toLowerCase();
  return type === 'darkvision' || sense === 'darkvision';
}

function mergeDarkvision(baseDv, effects) {
  let best = baseDv;
  const sources = [];
  effects.forEach((e) => {
    const v = Number(e.value || 0);
    if (!v) return;
    const effective = e.additive ? baseDv + v : v;
    if (effective > best) {
      best = effective;
      if (e.ownerName) sources.push(e.ownerName);
    }
  });
  return { value: best, sources };
}

export default function Senses({ C }) {
  const passPerc = 10 + getSkillBonus(C, { n: 'Perception', a: 'wis' });
  const passInv = 10 + getSkillBonus(C, { n: 'Investigation', a: 'int' });
  const passIns = 10 + getSkillBonus(C, { n: 'Insight', a: 'wis' });
  const speciesDv = C.speciesSnapshot?.darkvision || 0;
  const itemSenses = getItemSenses(C);
  const baseDv = Math.max(speciesDv, itemSenses.darkvision || 0);
  const senseEffects = collectSenseEffects(C);
  const dvEffects = senseEffects.filter(isDarkvisionEffect);
  const otherEffects = senseEffects.filter((e) => !isDarkvisionEffect(e));
  const extraItemSenses = Object.entries(itemSenses).filter(([type]) => type !== 'darkvision');
  const dv = mergeDarkvision(baseDv, dvEffects);

  return (
    <Paper variant="outlined" sx={{ mb: '0.6rem', overflow: 'hidden' }}>
      <Box sx={{ bgcolor: 'rgba(35,32,26,1)', borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1, px: '0.8rem', py: '0.48rem', borderLeft: 3, borderLeftColor: 'primary.main' }}>
        <Eye size={14} />
        <Typography sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'primary.main' }}>
          Senses
        </Typography>
      </Box>
      <Box sx={{ p: '0.55rem 0.8rem' }}>
        <SenseRow value={passPerc} label="Passive Perception" />
        <SenseRow value={passInv} label="Passive Investigation" />
        <SenseRow value={passIns} label="Passive Insight" />
        {dv.value > 0 && (
          <SenseRow
            value={`${dv.value} ft`}
            label={`Darkvision${dv.sources.length ? ` · ${dv.sources.join(', ')}` : ''}`}
            color="secondary.main"
          />
        )}
        {extraItemSenses.map(([type, dist]) => (
          <SenseRow key={`item-sense-${type}`} value={`${dist} ft`} label={SENSE_LABELS[type] || type} color="secondary.main" />
        ))}
        {otherEffects.map((effect, index) => (
          <SenseRow
            key={`${effect.ownerName}-${effect.type}-${index}`}
            value={senseEffectValue(effect)}
            label={`${effectTitle(effect)}${effect.ownerName ? ` · ${effect.ownerName}` : ''}`}
            color="secondary.main"
          />
        ))}
      </Box>
    </Paper>
  );
}

function SenseRow({ value, label, color }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, py: 0.25, bgcolor: 'rgba(35,32,26,1)', border: 1, borderColor: 'divider', borderRadius: 1, mb: 0.2 }}>
      <Typography sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '1.15rem', fontWeight: 700, color: color || '#edd48a', flexShrink: 0 }}>
        {value}
      </Typography>
      <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>{label}</Typography>
    </Box>
  );
}


function senseEffectValue(effect) {
  if (effect?.value != null) {
    if (typeof effect.value === 'number') return `${effect.value} ft`;
    return String(effect.value);
  }
  if (effect?.senseType) return String(effect.senseType).replace(/^\w/, (c) => c.toUpperCase());
  const summary = effectSummary(effect);
  return summary || 'Yes';
}
