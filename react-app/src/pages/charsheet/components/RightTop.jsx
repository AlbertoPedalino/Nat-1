import { useState, useCallback } from 'react';
import { Box, Typography, Chip, Tooltip } from '@mui/material';
import { Swords, Shield, Sparkles, AlertCircle } from 'lucide-react';
import { getInitiative } from '../logic/calculations.js';
import { getConditionsWithEffect } from '../logic/conditions.js';
import { getArmorTrainingInfo } from '../logic/proficiencies.js';
import { collectResolvedResistanceItems, collectResolvedImmunityItems, getInitiativeAdvantageFromEffects } from '../logic/sheetEffects.js';
import { advantageVisual } from './advantageMark.jsx';
import { collectItemResistanceItems, collectItemImmunityItems, collectItemConditionImmunityItems, collectItemEffects } from '../../../shared/character/itemEffects.js';
import { computeBestArmorClass } from '../../../shared/character/ac.js';
import { resolveInitiativeTriggeredResourceRecoveries } from '../../../shared/character/initiativeEffects.js';
import { useProficiencySets } from '../context/ProficiencySetsContext.jsx';
import ConditionsBlock from './ConditionsBlock.jsx';

export default function RightTop({ C, sheet, onRoll, onToggleCondition, onClearConditions, onSetExhaustion, conditionEntries, onToggleInspiration, resources, setResources, onShowToast }) {
  // Initiative is a DEX check (D20 Test) but rolls its own d20 here (it also fires
  // initiative-triggered recoveries), so the exhaustion −2/level penalty is applied
  // to the modifier directly rather than via rollD20. Adapter-granted bonuses
  // (e.g. Alert feat → +PB) are folded in by getInitiative.
  const initMod = getInitiative(C, sheet);
  const initAdv = getInitiativeAdvantageFromEffects(C);
  const hasInitAdv = !!initAdv;
  const [lastInitiativeRoll, setLastInitiativeRoll] = useState(null);
  const [initiativeMessage, setInitiativeMessage] = useState('');

  const handleInitiativeRoll = useCallback(() => {
    // Roll with Advantage (keep higher of 2d20) when a source grants it.
    const r1 = Math.floor(Math.random() * 20) + 1;
    const r2 = hasInitAdv ? Math.floor(Math.random() * 20) + 1 : null;
    const d20 = r2 != null ? Math.max(r1, r2) : r1;
    const total = d20 + initMod;
    setLastInitiativeRoll({ d20, mod: initMod, total });

    const bonusText = initMod >= 0 ? `+${initMod}` : `${initMod}`;
    const advText = hasInitAdv ? ' (Adv)' : '';
    const recoveryParts = [];

    if (resources && typeof setResources === 'function') {
      const result = resolveInitiativeTriggeredResourceRecoveries(C, resources);
      if (result.resources !== resources) {
        setResources(result.resources);
      }
      recoveryParts.push(...(result.applied || []));
    }

    if (recoveryParts.length) {
      const msg = recoveryParts.map(a => `${a.label}: ${a.resourceLabel || a.resourceKey} ${a.from} → ${a.to}`).join(' • ');
      setInitiativeMessage(msg);
    } else {
      setInitiativeMessage('');
    }

    const dice = r2 != null
      ? [{ v: r1, faces: 20, kept: r1 >= r2 }, { v: r2, faces: 20, kept: r2 > r1 }]
      : [{ v: d20, faces: 20, kept: true }];

    const toastDetail = recoveryParts.length
      ? `d20${advText} ${bonusText} = ${total} · ${recoveryParts.map(a => `${a.label}: ${a.resourceLabel || a.resourceKey} ${a.from} → ${a.to}`).join(', ')}`
      : `d20${advText} ${bonusText} = ${total}`;

    if (typeof onShowToast === 'function') {
      onShowToast('Initiative', toastDetail, total, dice, { bonus: initMod, kept: d20 });
    }
  }, [C, resources, setResources, onShowToast, initMod, hasInitAdv]);

  const inv = sheet?.sheetInventory || [];
  const equippedShield = inv.find(i => i.equipped && i.type === 'S');
  const profSets = useProficiencySets();
  const shieldUnproficient = equippedShield ? !getArmorTrainingInfo(C, equippedShield, null, profSets).trained : false;
  const shieldTrained = !shieldUnproficient;
  const acResult = computeBestArmorClass(C, inv, shieldTrained);
  const ac = acResult?.value ?? 10;
  const acSource = acResult?.source;
  const showAcBadge = acResult?.sourceType === 'formula';

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', gap: '0.45rem', mb: '0.4rem', flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.15 }}>
          <Tooltip title={initAdv ? `Advantage on Initiative — ${initAdv.source}` : ''}>
            <Box>
              <CircleStat onClick={handleInitiativeRoll} value={initMod >= 0 ? `+${initMod}` : initMod} label="Initiative" clickable />
            </Box>
          </Tooltip>
          {initAdv && (() => {
            const v = advantageVisual(true, false);
            const Icon = v.Icon;
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                <Icon size={11} color={v.color} />
                <Typography sx={{ fontSize: '0.5rem', color: v.color, fontWeight: 700, letterSpacing: '0.06em' }}>{v.label}</Typography>
              </Box>
            );
          })()}
          {lastInitiativeRoll && (
            <Typography variant="caption" sx={{ fontSize: '0.72rem', color: 'text.secondary', textAlign: 'center', lineHeight: 1.25 }}>
              Last: <Box component="span" sx={{ fontWeight: 700, color: '#edd48a' }}>{lastInitiativeRoll.total}</Box> ({lastInitiativeRoll.d20}{lastInitiativeRoll.mod >= 0 ? ` + ${lastInitiativeRoll.mod}` : ` - ${Math.abs(lastInitiativeRoll.mod)}`})
            </Typography>
          )}
          {initiativeMessage && (
            <Typography variant="caption" sx={{ fontSize: '0.48rem', color: '#58b879', textAlign: 'center', lineHeight: 1.15, maxWidth: 90, wordBreak: 'break-word' }}>
              {initiativeMessage}
            </Typography>
          )}
        </Box>
        <ACDisplay value={ac} shieldUnproficient={shieldUnproficient} source={acSource} showBadge={showAcBadge} badgeLabel={acSource} />
        <InspirationBlock sheet={sheet} onToggle={onToggleInspiration} />
        <DefensesBlock C={C} activeConditions={sheet?.activeConditions || []} />
      </Box>
      <ConditionsBlock sheet={sheet} onToggle={onToggleCondition} onClear={onClearConditions} onSetExhaustion={onSetExhaustion} conditionEntries={conditionEntries} />
    </Box>
  );
}

function CircleStat({ value, label, clickable, onClick, children }) {
  return (
    <Box onClick={onClick}
      sx={{
        width: 62, height: 62, borderRadius: '50%', border: 2, borderColor: 'divider',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        bgcolor: 'rgba(35,32,26,1)',
        ...(clickable ? { cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } } : {}),
      }}>
      {children || <><Typography sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '1.25rem', fontWeight: 700, color: '#edd48a', lineHeight: 1 }}>{value}</Typography>
        <Typography sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.44rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'text.secondary', mt: 0.15 }}>{label}</Typography></>}
    </Box>
  );
}

function ACDisplay({ value, shieldUnproficient, source, showBadge, badgeLabel }) {
  const tooltipText = shieldUnproficient
    ? "Shield not proficient - no AC bonus"
    : source
      ? `AC ${value} — ${source}`
      : '';
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
      <Tooltip title={tooltipText}>
        <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 62, height: 68, flexShrink: 0, borderRadius: 1, border: shieldUnproficient ? 1 : 'none', borderColor: shieldUnproficient ? 'warning.main' : 'transparent' }}>
          <Shield size={62} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', color: shieldUnproficient ? 'rgba(255,152,0,0.2)' : 'rgba(202,165,80,0.14)' }} />
          <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
            <Typography sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '1.25rem', fontWeight: 700, color: '#edd48a', lineHeight: 1 }}>{value}</Typography>
            <Typography sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.44rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'text.secondary' }}>AC</Typography>
          </Box>
          {shieldUnproficient && <AlertCircle size={12} style={{ position: 'absolute', top: 2, right: 2, color: '#ff9800' }} />}
        </Box>
      </Tooltip>
      {showBadge && badgeLabel ? (
        <Typography sx={{ fontSize: '0.45rem', color: '#70b7a6', fontWeight: 700, textAlign: 'center', lineHeight: 1.1, maxWidth: 72, whiteSpace: 'normal', wordBreak: 'break-word' }}>
          {badgeLabel}
        </Typography>
      ) : null}
    </Box>
  );
}

function InspirationBlock({ sheet, onToggle }) {
  const insp = sheet.sheetInspiration;
  return (
    <Box onClick={onToggle} sx={{ minWidth: 90, maxWidth: 110, bgcolor: 'rgba(35,32,26,1)', border: 1, borderColor: insp ? 'primary.main' : 'divider', borderRadius: 1, p: '0.4rem 0.62rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0.25, cursor: 'pointer', '&:hover': { borderColor: 'primary.main' }, ...(insp ? { bgcolor: 'rgba(202,165,80,0.14)' } : {}) }}>
      <Sparkles size={20} style={{ color: insp ? '#edd48a' : 'text.secondary', filter: insp ? 'drop-shadow(0 0 6px rgba(202,165,80,0.6))' : 'none' }} />
      <Typography sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: insp ? 'primary.main' : 'text.secondary', textAlign: 'center' }}>
        {insp ? 'Insp.' : 'No Insp.'}
      </Typography>
    </Box>
  );
}

function DefensesBlock({ C, activeConditions = [] }) {
  const itemEffects = collectItemEffects(C?.inventory);
  // Conditions granting resistance to all damage (e.g. Petrified).
  const conditionResistAll = getConditionsWithEffect(activeConditions, 'resistAllDmg')
    .map((source) => ({ type: 'All damage', kind: 'Resist', source }));
  const advSaves = [...itemEffects.advantageOnSaveAgainst.entries()].flatMap(([target, sources]) =>
    sources.map((src) => ({ type: `Save vs ${target}`, kind: 'Adv', source: src })),
  );
  const attackerDisadv = (itemEffects.disadvantageOnAttackersAgainstYou || []).map((entry) => ({
    type: 'Attackers DIS', kind: '', source: entry.source, note: entry.note,
  }));
  const passiveTraits = (itemEffects.passiveTraits || []).map((entry) => ({
    type: entry.text, kind: 'Trait', source: entry.source,
  }));
  const all = [
    ...conditionResistAll,
    ...collectResolvedResistanceItems(C).map((item) => ({ type: item.label, kind: 'Resist', source: item.source })),
    ...collectItemResistanceItems(C).map((item) => ({ type: item.label, kind: 'Resist', source: item.source })),
    ...collectResolvedImmunityItems(C).map((item) => ({ type: item.label, kind: 'Immune', source: item.source })),
    ...collectItemImmunityItems(C).map((item) => ({ type: item.label, kind: 'Immune', source: item.source })),
    ...collectItemConditionImmunityItems(C).map((item) => ({ type: item.label, kind: 'Cond. Immune', source: item.source })),
    ...advSaves,
    ...attackerDisadv,
    ...passiveTraits,
  ];

  return (
    <Box sx={{ flex: 1, minWidth: 140, bgcolor: 'rgba(35,32,26,1)', border: 1, borderColor: 'divider', borderRadius: 1, p: '0.4rem 0.62rem' }}>
      <Typography sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'primary.main', mb: 0.4 }}>Defenses</Typography>
      {all.length === 0 && <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', fontStyle: 'italic' }}>No resistances detected.</Typography>}
      {all.map((d, i) => (
        <Chip
          key={`${d.kind}-${d.type}-${i}`}
          size="small"
          label={`${d.kind} ${d.type}${d.source ? ` · ${d.source}` : ''}`}
          variant="outlined"
          sx={{ fontSize: '0.5rem', m: 0.15 }}
        />
      ))}
    </Box>
  );
}
