import { Box, Chip, Paper, Tooltip, Typography } from '@mui/material';
import { Footprints, AlertCircle } from 'lucide-react';
import { getEquippedArmorPenalties } from '../logic/armorPenalties.js';
import { getFinal } from '../logic/calculations.js';
import { collectMovementEffects, effectSummary, effectTitle, getSpeedBonus } from '../logic/sheetEffects.js';
import { useProficiencySets } from '../context/ProficiencySetsContext.jsx';

function normalizeSpeed(speed) {
  if (typeof speed === 'number') return { walk: speed };
  if (!speed || typeof speed !== 'object') return { walk: 30 };
  const out = {};
  Object.entries(speed).forEach(([key, value]) => {
    if (typeof value === 'number' && value > 0) out[key] = value;
  });
  if (!out.walk) out.walk = 30;
  return out;
}

function speedLabel(key) {
  return key === 'walk' ? 'Walk' : key.charAt(0).toUpperCase() + key.slice(1);
}

function qty(item) {
  return Number(item?.qty || item?.quantity || 1);
}

function totalCarriedWeight(inventory) {
  return (inventory || []).reduce((sum, item) => sum + Number(item?.weight || item?.weightLb || 0) * qty(item), 0);
}

export default function Movement({ C, sheet }) {
  const inventory = sheet?.sheetInventory || C?.inventory || [];
  const profSets = useProficiencySets();
  const penalties = getEquippedArmorPenalties(C, inventory, profSets);
  const baseSpeeds = normalizeSpeed(C?.speciesSnapshot?.speed);
  const speedPenalty = penalties.speedPenalty || 0;
  const maxCarry = Math.max(1, getFinal(C, 'str') * 15);
  const carriedWeight = totalCarriedWeight(inventory);
  const overloaded = carriedWeight > maxCarry;
  const speedZero = (sheet?.activeConditions || []).includes('grappled');
  const movementEffects = collectMovementEffects(C).filter((effect) => {
    if (String(effect.type || '').toLowerCase() === 'speed' && typeof effect.value === 'number') {
      return getSpeedBonus(C) > 0;
    }
    return true;
  });
  const runtimeSpeedBonus = getSpeedBonus(C);
  const entries = Object.entries(baseSpeeds).map(([key, value]) => ({
    key,
    base: value,
    final: speedZero ? 0 : overloaded ? Math.min(5, Math.max(0, value + speedPenalty + runtimeSpeedBonus)) : Math.max(0, value + speedPenalty + runtimeSpeedBonus),
  }));
  const hasPenalty = speedPenalty < 0 || overloaded || speedZero;
  const reasons = [
    speedZero ? 'Grappled: speed 0' : null,
    overloaded ? `Over carry: speed 5 ft (${carriedWeight.toFixed(1)} / ${maxCarry} lb)` : null,
    speedPenalty < 0 ? `Armor STR requirement: ${speedPenalty} ft` : null,
  ].filter(Boolean);
  const reason = reasons.join(' • ');

  return (
    <Paper variant="outlined" sx={{ mb: '0.6rem', overflow: 'hidden' }}>
      <Box sx={{ bgcolor: 'rgba(35,32,26,1)', borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1, px: '0.8rem', py: '0.48rem', borderLeft: 3, borderLeftColor: hasPenalty ? 'warning.main' : 'primary.main' }}>
        <Footprints size={14} />
        <Typography sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: hasPenalty ? 'warning.main' : 'primary.main' }}>
          Movement
        </Typography>
        {hasPenalty ? (
          <Tooltip title={reason}>
            <AlertCircle size={12} style={{ color: '#ff9800', marginLeft: 'auto' }} />
          </Tooltip>
        ) : null}
      </Box>
      <Box sx={{ p: '0.55rem 0.8rem', display: 'grid', gap: 0.35 }}>
        {entries.map((entry) => (
          <Box key={entry.key} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, py: 0.35, bgcolor: 'rgba(35,32,26,1)', border: 1, borderColor: hasPenalty ? 'warning.main' : 'divider', borderRadius: 1 }}>
            <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>{speedLabel(entry.key)}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
              <Typography sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '1.15rem', fontWeight: 700, color: hasPenalty ? '#ffb74d' : '#edd48a', lineHeight: 1 }}>
                {entry.final}
              </Typography>
              <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary' }}>ft</Typography>
            </Box>
          </Box>
        ))}
        {movementEffects.length ? (
          <Box sx={{ display: 'grid', gap: 0.25, mt: 0.25 }}>
            {movementEffects.map((effect, index) => (
              <Chip
                key={`${effect.ownerName}-${effect.type}-${index}`}
                size="small"
                label={`${effectTitle(effect)}${effectSummary(effect) ? `: ${effectSummary(effect)}` : ''}`}
                variant="outlined"
                sx={{ height: 20, fontSize: '0.52rem', color: '#edd48a', borderColor: 'rgba(237,212,138,0.38)', justifyContent: 'flex-start' }}
              />
            ))}
          </Box>
        ) : null}
        {hasPenalty ? (
          <Chip size="small" label={reason} variant="outlined" sx={{ height: 20, fontSize: '0.52rem', color: '#ffb74d', borderColor: 'rgba(255,183,77,0.45)', justifyContent: 'flex-start' }} />
        ) : null}
      </Box>
    </Paper>
  );
}
