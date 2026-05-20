import { useState, useCallback } from 'react';
import { Box, Typography, Chip, Tooltip } from '@mui/material';
import { Swords, Shield, Sparkles, ListChecks, X, AlertCircle } from 'lucide-react';
import { getMod, getFinal } from '../logic/calculations.js';
import { CONDITIONS } from '../logic/calculations.js';
import { getArmorTrainingInfo } from '../logic/proficiencies.js';
import { collectResolvedResistanceItems, collectResolvedImmunityItems } from '../logic/sheetEffects.js';
import { computeBestArmorClass } from '../../../shared/character/ac.js';
import { resolveInitiativeTriggeredResourceRecoveries } from '../../../shared/character/initiativeEffects.js';
import { useProficiencySets } from '../context/ProficiencySetsContext.jsx';

export default function RightTop({ C, sheet, onRoll, onToggleCondition, onClearConditions, onToggleInspiration, resources, setResources, onShowToast }) {
  const initMod = getMod(getFinal(C, 'dex'));
  const [lastInitiativeRoll, setLastInitiativeRoll] = useState(null);
  const [initiativeMessage, setInitiativeMessage] = useState('');

  const handleInitiativeRoll = useCallback(() => {
    const d20 = Math.floor(Math.random() * 20) + 1;
    const total = d20 + initMod;
    setLastInitiativeRoll({ d20, mod: initMod, total });

    const bonusText = initMod >= 0 ? `+${initMod}` : `${initMod}`;
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

    const toastDetail = recoveryParts.length
      ? `d20 ${bonusText} = ${total} · ${recoveryParts.map(a => `${a.label}: ${a.resourceLabel || a.resourceKey} ${a.from} → ${a.to}`).join(', ')}`
      : `d20 ${bonusText} = ${total}`;

    if (typeof onShowToast === 'function') {
      onShowToast('Initiative', toastDetail, total, [{ v: d20, faces: 20, kept: true }], { bonus: initMod, kept: d20 });
    }
  }, [C, resources, setResources, onShowToast, initMod]);

  const active = CONDITIONS.filter(c => sheet.activeConditions.includes(c.key));
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
          <CircleStat onClick={handleInitiativeRoll} value={initMod >= 0 ? `+${initMod}` : initMod} label="Initiative" clickable />
          {lastInitiativeRoll && (
            <Typography variant="caption" sx={{ fontSize: '0.5rem', color: 'text.secondary', textAlign: 'center', lineHeight: 1.2 }}>
              Last: {lastInitiativeRoll.total} ({lastInitiativeRoll.d20}{lastInitiativeRoll.mod >= 0 ? ` + ${lastInitiativeRoll.mod}` : ` - ${Math.abs(lastInitiativeRoll.mod)}`})
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
        <DefensesBlock C={C} />
      </Box>
      <ConditionsBlock active={active} sheet={sheet} onToggle={onToggleCondition} onClear={onClearConditions} />
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

function DefensesBlock({ C }) {
  const all = [
    ...collectResolvedResistanceItems(C).map((item) => ({ type: item.label, kind: 'Resist', source: item.source })),
    ...collectResolvedImmunityItems(C).map((item) => ({ type: item.label, kind: 'Immune', source: item.source })),
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

function ConditionsBlock({ active, sheet, onToggle, onClear }) {
  const [open, setOpen] = useState(false);
  return (
    <Box sx={{ flex: 1, minWidth: 140, bgcolor: 'rgba(35,32,26,1)', border: 1, borderColor: 'divider', borderRadius: 1, p: '0.4rem 0.62rem' }}>
      <Typography sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'primary.main', mb: 0.4 }}>Conditions</Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25 }}>
          {active.length === 0 && <Chip size="small" label="— None" variant="outlined" sx={{ fontSize: '0.5rem', borderStyle: 'dashed' }} />}
          {active.map(c => (
            <Chip key={c.key} size="small" label={c.label} onDelete={() => onToggle(c.key)}
              sx={{ fontSize: '0.5rem', color: '#d69245', borderColor: '#d69245', bgcolor: 'rgba(213,138,61,0.14)' }} />
          ))}
        </Box>
        <Box sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 1, p: '3px 6px' }}>
          <Box component="summary" onClick={() => setOpen(!open)}
            sx={{ cursor: 'pointer', fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.56rem', color: 'text.secondary', letterSpacing: '0.06em', display: 'inline-flex', alignItems: 'center', gap: 0.5, userSelect: 'none' }}>
            <ListChecks size={12} /> Manage ({active.length})
          </Box>
          {open && (
            <Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(108px,1fr))', gap: 0.25, mt: 0.5 }}>
                {CONDITIONS.map(c => {
                  const isOn = sheet.activeConditions.includes(c.key);
                  return (
                    <Chip key={c.key} size="small" label={c.label} variant={isOn ? 'filled' : 'outlined'}
                      onClick={() => onToggle(c.key)}
                      sx={{ fontSize: '0.5rem', cursor: 'pointer', justifyContent: 'flex-start', ...(isOn ? { color: '#d69245', bgcolor: 'rgba(213,138,61,0.14)' } : {}) }} />
                  );
                })}
              </Box>
              {active.length > 0 && (
                <Chip size="small" label="Clear" onDelete={onClear} deleteIcon={<X size={12} />} sx={{ mt: 0.5, fontSize: '0.5rem' }} />
              )}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}


