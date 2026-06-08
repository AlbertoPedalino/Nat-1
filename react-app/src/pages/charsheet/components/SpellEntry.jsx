import { Box, Button, Stack, Tooltip, Typography } from '@mui/material';
import { Cross, Dices, Sword } from 'lucide-react';
import { SPELL_LEVEL_LABELS } from '../../charbuilder/constants.js';
import { SpellNameIcon } from '../../../shared/character/FiveEToolsLink.jsx';
import { RichInline } from '../../../shared/character/RichText.jsx';
import { EntryBlocks } from '../../../shared/character/EntryBlocks.jsx';
import { SpellMetaGrid, HigherLevelBlock } from '../../../shared/character/SpellReference.jsx';
import { ExpandableCard } from '../../../shared/character/ExpandableCard.jsx';
import PipButton from '../../../shared/character/PipButton.jsx';
import { formatRollTitle, rollFormula as rollFormulaDice } from '../../../shared/character/dice.js';
import { SCHOOL_LABELS, getFinal, getMod, getPB, hasConditionEffect, getConditionalConditionEffects } from '../logic/calculations.js';
import { getSpellAttackAdvantage } from '../logic/sheetEffects.js';
import {
  applySpellModifiers,
  computeScaledFormula,
  extractDamageDice,
  getCastBadge,
  getResolvedCantripData,
  getSpellAbilityForEntry,
  getSpellStatusChips,
  getUpcastStep,
  entriesToTextBlocks,
  resolveDmgBonusValue,
} from '../logic/spellsTabLogic.js';
import { inlineButtonSx, spellBodySx, spellRowSx } from './spellsTabStyles.js';
import AttackRollButton from './AttackRollButton.jsx';
import { isConcentrationSpell, isRitualSpell } from '../../../shared/spellTags.js';
import { useSheetActions } from '../context/SheetActionsContext.jsx';

function applyFlatToFormula(formula, flat) {
  if (!formula) return formula;
  if (!flat) return formula;
  const text = String(formula).replace(/\s+/g, '');
  const match = text.match(/^(\d+)d(\d+)([+-]\d+)?$/i);
  if (!match) return formula;
  const count = Number(match[1]);
  const faces = Number(match[2]);
  const total = Number(match[3] || 0) + Number(flat || 0);
  return `${count}d${faces}${total ? (total > 0 ? '+' : '') + total : ''}`;
}

function Badge({ label, color, bg = 'transparent' }) {
  return (
    <Box component="span" sx={{ border: 1, borderColor: color, color, bgcolor: bg, borderRadius: '3px', px: '6px', py: '1px', fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.56rem', lineHeight: 1.35, flexShrink: 0 }}>
      {label}
    </Box>
  );
}

// Source badge for a spell row. When the same spell is granted by more than
// one source (e.g. a Forest Gnome Druid's Speak with Animals), the row stays
// consolidated to a single badge showing the primary source plus a `+N`
// indicator, with all contributing sources listed in a tooltip.
function SourceBadge({ sourceInfo, sources, suffix = '' }) {
  if (!sourceInfo) return null;
  const all = (sources && sources.length ? sources : [sourceInfo]).filter(Boolean);
  const extra = all.length - 1;
  const label = sourceInfo.label + suffix + (extra > 0 ? ` +${extra}` : '');
  const badge = <Badge label={label} color={sourceInfo.color || '#9d7fb8'} bg="rgba(157,127,184,0.16)" />;
  if (extra <= 0) return badge;
  const title = 'Sources: ' + all.map((s) => s.originLabel || s.label).filter(Boolean).join(', ');
  return <Tooltip title={title} arrow><Box component="span" sx={{ display: 'inline-flex' }}>{badge}</Box></Tooltip>;
}

function FreeCastsInline({ freeCasts, freeCastUses, onToggleFreeCast, sx }) {
  if (!Array.isArray(freeCasts) || !freeCasts.length) return null;
  const interactive = typeof onToggleFreeCast === 'function';
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', mt: 0.35, px: '7px', py: '4px', border: 1, borderColor: 'rgba(202,165,80,0.28)', borderRadius: '5px', bgcolor: 'rgba(202,165,80,0.06)', ...(sx || {}) }}>
      <Typography sx={{ fontSize: '0.55rem', color: 'text.secondary', fontFamily: '"Cinzel", Georgia, serif', mr: 0.25, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        Free Cast
      </Typography>
        {freeCasts.map((fc) => {
          const used = Math.max(0, Number(freeCastUses?.[fc.id] || 0));
          const max = Math.max(1, Number(fc.max) || 1);
          return (
            <Box key={fc.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.55, flexWrap: 'wrap' }}>
              <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 700, lineHeight: 1.1 }}>
                {fc.label}
              </Typography>
              <Box sx={{ display: 'inline-flex', gap: '3px', alignItems: 'center' }}>
                {Array.from({ length: max }).map((_, i) => {
                  const isUsed = i < used;
                  return (
                    <PipButton
                      key={`${fc.id}-dot-${i}`}
                      size={10}
                      round
                      title={isUsed ? 'Free cast used' : 'Free cast available'}
                      aria-label={`${fc.label}: ${isUsed ? 'free cast used' : 'free cast available'}`}
                      onClick={interactive ? (e) => { e.stopPropagation(); onToggleFreeCast(fc); } : undefined}
                      sx={{
                        border: '1.5px solid',
                        borderColor: isUsed ? '#edd48a' : 'rgba(202,165,80,0.35)',
                        bgcolor: isUsed ? '#caa550' : 'transparent',
                        '&:hover:not(:disabled)': interactive ? { borderColor: '#edd48a', boxShadow: '0 0 0 2px rgba(202,165,80,0.22)' } : undefined,
                      }}
                    />
                  );
                })}
              </Box>
              <Typography variant="caption" color={used >= max ? '#a04848' : 'text.secondary'} sx={{ lineHeight: 1.1 }}>
                {fc.rechargeLabel}
                {fc.canAlsoUseSlots === false ? ' · free only' : ' · also slots'}
                {used >= max ? ' · spent' : ''}
              </Typography>
            </Box>
          );
        })}
    </Box>
  );
}


function normalizeModifierDetails(cantripData) {
  const raw = [
    ...(Array.isArray(cantripData?.modifiers) ? cantripData.modifiers : []),
    ...(Array.isArray(cantripData?.cantripModifiers) ? cantripData.cantripModifiers : []),
    ...(Array.isArray(cantripData?.extraDetails) ? cantripData.extraDetails : []),
  ];
  const seen = new Set();
  return raw
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      key: item.key || item.label || item.tagLabel || item.detailTitle || null,
      label: item.label || null,
      tagLabel: item.tagLabel || item.label || null,
      detailGroupLabel: item.detailGroupLabel || item.groupLabel || null,
      detailTitle: item.detailTitle || item.tagLabel || item.label || null,
      detailText: item.detailText || item.description || null,
      description: item.description || item.detailText || null,
    }))
    .filter((item) => {
      const dedupeKey = item.key || item.label || item.tagLabel || item.detailTitle;
      if (!dedupeKey || seen.has(dedupeKey)) return false;
      if (!item.detailText && !item.description) return false;
      seen.add(dedupeKey);
      return true;
    });
}

function groupModifierDetails(details) {
  const groups = new Map();
  details.forEach((item) => {
    const label = item.detailGroupLabel || 'Modifier Details';
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(item);
  });
  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
}

export default function SpellEntry({ entry, spellAttackBonus = 0, C, exhaustionLevel = 0, activeConditions = [], installedRegistry, freeCastUses }) {
  const { onRoll, onShowToast, onToggleFreeCast } = useSheetActions();
  const castLevel = entry.castLevel || entry.level || 0;
  const baseLevel = entry.level || 0;
  const school = SCHOOL_LABELS[entry.school] || entry.school || '';
  const bodyBlocks = entriesToTextBlocks(entry.descriptionEntries || entry.entries);
  const higherEntries = entry.higherLevelEntries || entry.entriesHigherLevel;
  const rawDamages = extractDamageDice(entry.entries || []);
  const hasAttack = !!entry.spellAttack;
  const spellData = installedRegistry.getSpellData(entry.name);
  const hasConcentrationTag = isConcentrationSpell(entry) || isConcentrationSpell(spellData);
  const hasRitualTag = isRitualSpell(entry) || isRitualSpell(spellData);
  const ritualOnly = !!entry.ritualOnly || entry.sourceInfo?.kind === 'ritualBook';
  const hasHeal = !!spellData?.heal;
  const rawHealFormula = hasHeal ? (spellData?.baseDie || (rawDamages.length > 0 ? rawDamages[0].formula : null)) : null;
  const damages = hasHeal ? [] : rawDamages;
  const hasDamage = damages.length > 0;
  const steps = castLevel - baseLevel;

  const spellAbility = getSpellAbilityForEntry(C, entry);
  const spellMod = getMod(getFinal(C, spellAbility));
  // Per-entry casting ability + global magic-item spell-attack bonus (matches the
  // SpellsTab header so the button and the summary agree).
  const atk = getPB(C) + spellMod + spellAttackBonus;

  // Spell-attack advantage/disadvantage. Sources: effect-based advantage scoped
  // to this spell's owning class (e.g. Sorcerer Innate Sorcery) + condition-based
  // adv/disadv that applies to any attack roll (Frightened, Invisible, Prone, …).
  // XPHB 2024: any advantage + any disadvantage cancel to a straight roll. Mirrors
  // the weapon-attack logic in ActionsTab so spell and weapon attacks stay aligned.
  const innateSpellAdv = hasAttack ? getSpellAttackAdvantage(C, { ownerClassName: entry.ownerClassName }) : null;
  const spellAttackHasAdv = !!innateSpellAdv || hasConditionEffect(activeConditions, 'yourAttacksAdv');
  const spellAttackHasDisadv = hasConditionEffect(activeConditions, 'yourAttacksDisadv');
  const spellAttackAdv = spellAttackHasAdv && !spellAttackHasDisadv;
  const spellAttackDisadv = spellAttackHasDisadv && !spellAttackHasAdv;
  const spellAttackAdvArg = spellAttackDisadv ? false : spellAttackAdv ? true : undefined;
  const spellAttackCondNotes = getConditionalConditionEffects(activeConditions, 'yourAttacksDisadv')
    .map((c) => `${c.source} (${c.note})`);
  const spellAttackSituational = !spellAttackDisadv && !spellAttackAdv && spellAttackCondNotes.length > 0;
  const spellAttackTag = spellAttackDisadv ? ' DIS' : spellAttackAdv ? ' ADV' : spellAttackSituational ? ' DIS?' : '';
  const spellAttackTooltip = [
    innateSpellAdv && spellAttackAdv ? `Advantage: ${innateSpellAdv.source}` : '',
    spellAttackCondNotes.length ? `Situational disadvantage: ${spellAttackCondNotes.join('; ')}` : '',
  ].filter(Boolean).join(' • ');


  const upcastStepDie = (steps > 0) ? (spellData?.upcastDie || getUpcastStep(entry.entriesHigherLevel)?.stepDie) : null;
  const baseScaledDamages = upcastStepDie
    ? damages.map(d => ({ ...d, formula: computeScaledFormula(d.formula, upcastStepDie, steps) }))
    : damages;

  const cantripData = baseLevel === 0 ? getResolvedCantripData(C, entry.name) : null;
  const entryData = cantripData || spellData;
  const utilityDie = entryData?.utilityDie || null;
  const utilityLabel = entryData?.utilityLabel || 'Roll';
  const modifierDetails = normalizeModifierDetails(cantripData);
  const modifierDetailGroups = groupModifierDetails(modifierDetails);
  const detailTagLabels = modifierDetails.map((item) => item.tagLabel).filter(Boolean);
  const modifierTags = Array.from(new Set([...(cantripData?.modifierTags || []), ...detailTagLabels]));
  const characterLevel = Number(C?.level || C?.classLevel || 1);
  const beamCount = typeof cantripData?.beamCount === 'function'
    ? Math.max(1, Number(cantripData.beamCount(characterLevel) || 1))
    : 1;
  const beamBonus = resolveDmgBonusValue(C, cantripData?.dmgBonusPerBeam, getMod, getFinal);

  const expandedBeams = baseScaledDamages.flatMap((dmg, idx) => {
    const baseLabel = baseScaledDamages.length > 1 ? `Damage ${idx + 1}` : 'Damage';
    if (beamCount <= 1) return [{ ...dmg, label: baseLabel, formula: applyFlatToFormula(dmg.formula, beamBonus) || dmg.formula }];
    return Array.from({ length: beamCount }, (_, beamIdx) => ({
      ...dmg,
      label: `Beam ${beamIdx + 1}`,
      formula: applyFlatToFormula(dmg.formula, beamBonus) || dmg.formula,
    }));
  });

  const scaledDamages = expandedBeams.map((dmg) => ({
    ...dmg,
    formula: applySpellModifiers(C, {
      kind: 'damage',
      formula: dmg.formula,
      castLevel,
      level: baseLevel,
      spell: { ...entry, hasHeal: false, hasDamage: true, isCantrip: baseLevel === 0 },
      ownerClassName: entry.ownerClassName,
      ownerSubclassShortName: entry.ownerSubclassShortName,
      ownerLevel: entry.ownerLevel,
      hasHealContext: false,
      usesSpellSlot: baseLevel > 0 && !ritualOnly,
    }) || dmg.formula,
  }));
  const baseHealFormula = upcastStepDie && rawHealFormula
    ? computeScaledFormula(rawHealFormula, upcastStepDie, steps)
    : rawHealFormula;
  const healWithMod = baseHealFormula
    ? applyFlatToFormula(baseHealFormula, hasHeal ? spellMod : 0)
    : null;
  const healDisplayFormula = healWithMod
    ? applySpellModifiers(C, {
        kind: 'heal',
        formula: healWithMod,
        castLevel,
        level: baseLevel,
        spell: { ...entry, hasHeal: true, hasHealContext: true },
        ownerClassName: entry.ownerClassName,
        ownerSubclassShortName: entry.ownerSubclassShortName,
        ownerLevel: entry.ownerLevel,
        hasHealContext: true,
        usesSpellSlot: castLevel > 0 && !ritualOnly,
      }) || healWithMod
    : null;

  const levelLabel = castLevel > baseLevel ? ` (Lv.${castLevel})` : '';
  const hasFreeCasts = Array.isArray(entry.freeCasts) && entry.freeCasts.length > 0;

  const rollDmg = (e, formula, label) => {
    e.stopPropagation();
    const title = formatRollTitle(entry.name, `${label}${levelLabel}`);
    if (!formula) { onShowToast(title, '', 0, []); return; }
    const { total, rolls } = rollFormulaDice(formula);
    onShowToast(title, formula, total, rolls);
  };

  const rollHeal = (e, formula) => {
    e.stopPropagation();
    const title = formatRollTitle(entry.name, `Heal${levelLabel}`);
    if (!formula) { onShowToast(title, '', 0, []); return; }
    const { total, rolls } = rollFormulaDice(formula);
    onShowToast(title, formula, total, rolls);
  };

  return (
    <ExpandableCard
      containerSx={{ mb: '4px', overflow: 'hidden' }}
      detailsSx={{ ...spellBodySx, mt: 0, mb: 0 }}
      summary={({ toggle, open }) => (
        <Box onClick={toggle}
          sx={{ ...spellRowSx, mb: 0, borderRadius: open || hasFreeCasts ? '8px 8px 0 0' : 1, flexDirection: 'column', gap: '3px', alignItems: 'stretch' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
          <SpellNameIcon spell={entry} />
          <Typography noWrap sx={{ overflow: 'hidden', minWidth: 0, fontSize: '0.875rem', color: 'text.primary', textOverflow: 'ellipsis' }}>{entry.name}</Typography>
          {castLevel > baseLevel ? <Badge label={`Lv.${castLevel}`} color="#d69245" bg="rgba(214,146,69,0.14)" /> : null}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px', ml: 'auto', flexShrink: 0 }}>
            {(hasAttack || hasDamage || hasHeal || utilityDie) ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {hasAttack ? (
                  <AttackRollButton
                    rawBonus={atk}
                    exhaustionLevel={exhaustionLevel}
                    label={formatRollTitle(entry.name, `Spell Attack${levelLabel}`)}
                    advArg={spellAttackAdvArg}
                    tag={spellAttackTag}
                    tooltip={spellAttackTooltip}
                    onRoll={onRoll}
                    sx={{ borderColor: 'rgba(77,149,214,0.4)', color: '#4d95d6' }}
                  />
                ) : null}
                {scaledDamages.map((dmg, i) => (
                  <Button key={i} size="small" variant="outlined"
                    onClick={(e) => rollDmg(e, dmg.formula, dmg.label || `Damage ${i + 1}`)}
                    sx={{ ...inlineButtonSx, borderColor: 'rgba(255,107,53,0.4)', color: '#ff6b35' }}>
                    <Sword size={12} style={{ marginRight: 2 }} /> {beamCount > 1 ? `Beam ${i + 1} ${dmg.formula}` : `Dmg ${dmg.formula}`}
                  </Button>
                ))}
                {hasHeal ? (
                  <Button size="small" variant="outlined"
                    onClick={(e) => rollHeal(e, healDisplayFormula)}
                    sx={{ ...inlineButtonSx, borderColor: 'rgba(88,184,121,0.4)', color: '#58b879' }}>
                    <Cross size={12} style={{ marginRight: 2 }} /> Heal {healDisplayFormula}
                  </Button>
                ) : null}
                {utilityDie && !hasDamage && !hasHeal ? (
                  <Button size="small" variant="outlined"
                    onClick={(e) => rollDmg(e, utilityDie, utilityLabel)}
                    sx={{ ...inlineButtonSx, borderColor: 'rgba(77,149,214,0.4)', color: '#4d95d6' }}>
                    <Dices size={12} style={{ marginRight: 2 }} /> {utilityLabel} {utilityDie}
                  </Button>
                ) : null}
              </Box>
            ) : null}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '3px', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '3px', flexWrap: 'wrap' }}>
            <SourceBadge sourceInfo={entry.sourceInfo} sources={entry.sources} suffix={beamBonus ? ` ${beamBonus >= 0 ? '+' : ''}${beamBonus}` : ''} />
            {modifierTags.map(function (tag) { return <Badge key={tag} label={tag} color="#9d7fb8" bg="rgba(157,127,184,0.16)" />; })}
            {getSpellStatusChips(entry).map((chip) => <Badge key={chip.key} label={chip.label} color={chip.color} bg={chip.bg} />)}
            {ritualOnly ? <Badge label="Ritual only" color="#58b879" bg="rgba(63,166,108,0.14)" /> : null}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
            {beamCount > 1 ? <Badge label={`${beamCount} beams`} color="#9d7fb8" bg="rgba(157,127,184,0.16)" /> : null}
            {school ? <Badge label={school} color="#c4b393" /> : null}
            {hasConcentrationTag ? <Badge label="C" color="#9d7fb8" bg="rgba(157,127,184,0.16)" /> : null}
            {hasRitualTag ? <Badge label="R" color="#58b879" bg="rgba(63,166,108,0.14)" /> : null}
            <Badge {...getCastBadge(entry)} />
          </Box>
        </Box>
        </Box>
      )}
      persistent={({ open }) => (
        <FreeCastsInline
          freeCasts={entry.freeCasts}
          freeCastUses={freeCastUses}
          onToggleFreeCast={onToggleFreeCast}
          sx={{
            mt: 0,
            borderTop: 'none',
            borderColor: 'divider',
            borderRadius: open ? 0 : '0 0 8px 8px',
          }}
        />
      )}
      details={(
        <>
          <SpellMetaGrid spell={entry} sx={{ mb: '6px' }} />
          <EntryBlocks blocks={bodyBlocks} />
          {modifierDetailGroups.length ? (
            <Stack spacing={0.8} sx={{ mt: 1 }}>
              {modifierDetailGroups.map((group) => (
                <Box
                  key={group.label}
                  sx={{
                    pt: 0.8,
                    mt: 0.2,
                    borderTop: '1px dashed',
                    borderColor: 'divider',
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: '"Cinzel", Georgia, serif',
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      color: '#9d7fb8',
                      lineHeight: 1.15,
                    }}
                  >
                    {group.label}
                  </Typography>
                  <Stack spacing={0.55} sx={{ mt: 0.45 }}>
                    {group.items.map((modifier) => (
                      <Box key={modifier.key || modifier.label}>
                        <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                          {modifier.detailTitle || modifier.tagLabel || modifier.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.3, mt: 0.1 }}>
                          {modifier.detailText || modifier.description}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              ))}
            </Stack>
          ) : null}
          <HigherLevelBlock entries={higherEntries} />
        </>
      )}
    />
  );
}
