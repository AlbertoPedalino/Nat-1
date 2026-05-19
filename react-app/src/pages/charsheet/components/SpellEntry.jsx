import { useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { Cross, Sword } from 'lucide-react';
import { SPELL_LEVEL_LABELS } from '../../charbuilder/constants.js';
import { SpellNameIcon } from '../../../shared/character/FiveEToolsLink.jsx';
import { SCHOOL_LABELS, fbonus, getFinal, getMod, getPB } from '../logic/calculations.js';
import {
  applySpellModifiers,
  computeScaledFormula,
  extractDamageDice,
  getCastBadge,
  getMetaLine,
  getResolvedCantripData,
  getSpellAbilityForEntry,
  getSpellStatusChips,
  getUpcastStep,
  entriesToTextBlocks,
  resolveDmgBonusValue,
} from '../logic/spellsTabLogic.js';
import { inlineButtonSx, spellBodySx, spellRowSx } from './spellsTabStyles.js';
import { isConcentrationSpell, isRitualSpell } from '../../../shared/spellTags.js';

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

function FreeCastsInline({ freeCasts, freeCastUses, onToggleFreeCast }) {
  if (!Array.isArray(freeCasts) || !freeCasts.length) return null;
  const interactive = typeof onToggleFreeCast === 'function';
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', mt: 0.35, px: '7px', py: '4px', border: 1, borderColor: 'rgba(202,165,80,0.28)', borderRadius: '5px', bgcolor: 'rgba(202,165,80,0.06)' }}>
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
                    <Box
                      key={`${fc.id}-dot-${i}`}
                      title={isUsed ? 'Free cast used' : 'Free cast available'}
                      onClick={interactive ? (e) => { e.stopPropagation(); onToggleFreeCast(fc); } : undefined}
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        border: '1.5px solid',
                        borderColor: isUsed ? '#edd48a' : 'rgba(202,165,80,0.35)',
                        bgcolor: isUsed ? '#caa550' : 'transparent',
                        flexShrink: 0,
                        cursor: interactive ? 'pointer' : 'default',
                        transition: 'background-color 0.15s',
                        '&:hover': interactive ? { borderColor: '#edd48a', boxShadow: '0 0 0 2px rgba(202,165,80,0.22)' } : undefined,
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

function EntryBlocks({ blocks }) {
  if (!blocks?.length) {
    return <Typography variant="body2" color="text.secondary">No description.</Typography>;
  }

  return (
    <Stack spacing={0.65}>
      {blocks.map((block, index) => {
        if (block.kind === 'heading') {
          return (
            <Typography key={`h-${index}`} variant="body2" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.25 }}>
              {block.text}
            </Typography>
          );
        }
        if (block.kind === 'listItem') {
          return (
            <Box key={`li-${index}`} component="ul" sx={{ m: 0, pl: 2.2, color: 'text.secondary' }}>
              <Typography component="li" variant="body2" color="text.secondary" sx={{ lineHeight: 1.38 }}>
                {block.text}
              </Typography>
            </Box>
          );
        }
        if (block.kind === 'table') {
          return (
            <Box key={`tbl-${index}`} sx={{ overflowX: 'auto' }}>
              {block.caption ? (
                <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.35 }}>
                  {block.caption}
                </Typography>
              ) : null}
              <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
                {block.headers?.length ? (
                  <Box component="thead">
                    <Box component="tr">
                      {block.headers.map((cell, cellIndex) => (
                        <Box key={`th-${cellIndex}`} component="th" sx={{ textAlign: 'left', p: '3px 6px', borderBottom: '1px solid', borderColor: 'divider', color: 'text.primary' }}>
                          {cell}
                        </Box>
                      ))}
                    </Box>
                  </Box>
                ) : null}
                <Box component="tbody">
                  {(block.rows || []).map((row, rowIndex) => (
                    <Box key={`tr-${rowIndex}`} component="tr">
                      {row.map((cell, cellIndex) => (
                        <Box key={`td-${rowIndex}-${cellIndex}`} component="td" sx={{ p: '3px 6px', borderBottom: '1px solid', borderColor: 'divider', color: 'text.secondary', verticalAlign: 'top' }}>
                          {cell}
                        </Box>
                      ))}
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
          );
        }
        return (
          <Typography key={`p-${index}`} variant="body2" color="text.secondary" sx={{ lineHeight: 1.42 }}>
            {block.text}
          </Typography>
        );
      })}
    </Stack>
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

export default function SpellEntry({ entry, onShowToast, atk: fallbackAtk, spellMod: fallbackSpellMod, C, installedRegistry, freeCastUses, onToggleFreeCast }) {
  const [open, setOpen] = useState(false);
  const castLevel = entry.castLevel || entry.level || 0;
  const baseLevel = entry.level || 0;
  const school = SCHOOL_LABELS[entry.school] || entry.school || '';
  const metaLine = getMetaLine(entry);
  const bodyBlocks = entriesToTextBlocks(entry.descriptionEntries || entry.entries);
  const higherEntries = entry.higherLevelEntries || entry.entriesHigherLevel;
  const higherBlocks = higherEntries ? entriesToTextBlocks(higherEntries) : [];
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
  const atk = getPB(C) + spellMod;


  const upcastStepDie = (steps > 0) ? (spellData?.upcastDie || getUpcastStep(entry.entriesHigherLevel)?.stepDie) : null;
  const baseScaledDamages = upcastStepDie
    ? damages.map(d => ({ ...d, formula: computeScaledFormula(d.formula, upcastStepDie, steps) }))
    : damages;

  const cantripData = baseLevel === 0 ? getResolvedCantripData(C, entry.name) : null;
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

  const rollAtk = (e) => {
    e.stopPropagation();
    const r = Math.floor(Math.random() * 20) + 1;
    const bonusText = atk >= 0 ? `+${atk}` : `${atk}`;
    onShowToast(`${entry.name} — Spell Attack${levelLabel}`, `d20 ${bonusText} = ${r + atk}`, r + atk, [{ v: r, faces: 20, kept: true }], { bonus: atk, kept: r });
  };

  const rollDmg = (e, formula, label) => {
    e.stopPropagation();
    const match = formula.match(/(\d+)d(\d+)(?:\s*\+\s*(\d+))?/);
    if (!match) { onShowToast(`${entry.name} — ${label}${levelLabel}`, formula, 0, []); return; }
    const n = parseInt(match[1]);
    const faces = parseInt(match[2]);
    const flat = match[3] ? parseInt(match[3]) : 0;
    let total = 0;
    const rolls = [];
    for (let i = 0; i < n; i++) { const v = Math.floor(Math.random() * faces) + 1; rolls.push({ v, faces }); total += v; }
    total += flat;
    onShowToast(`${entry.name} — ${label}${levelLabel}`, formula, total, rolls);
  };

  const rollHeal = (e, formula) => {
    e.stopPropagation();
    if (!formula) { onShowToast(`${entry.name} — Heal${levelLabel}`, '', 0, []); return; }
    const match = formula.match(/(\d+)d(\d+)(?:\s*\+\s*(\d+))?/);
    if (!match) { onShowToast(`${entry.name} — Heal${levelLabel}`, formula, 0, []); return; }
    const n = parseInt(match[1]);
    const faces = parseInt(match[2]);
    const flat = match[3] ? parseInt(match[3]) : 0;
    let total = 0;
    const rolls = [];
    for (let i = 0; i < n; i++) { const v = Math.floor(Math.random() * faces) + 1; rolls.push({ v, faces }); total += v; }
    total += flat;
    onShowToast(`${entry.name} — Heal${levelLabel}`, formula, total, rolls);
  };

  return (
    <Box>
      <Box onClick={() => setOpen(!open)}
        sx={{ ...spellRowSx, flexDirection: 'column', gap: '3px', alignItems: 'stretch' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
          <SpellNameIcon spell={entry} />
          <Typography noWrap sx={{ overflow: 'hidden', minWidth: 0, fontSize: '0.875rem', color: 'text.primary', textOverflow: 'ellipsis' }}>{entry.name}</Typography>
          {castLevel > baseLevel ? <Badge label={`Lv.${castLevel}`} color="#d69245" bg="rgba(214,146,69,0.14)" /> : null}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px', ml: 'auto', flexShrink: 0 }}>
            {(hasAttack || hasDamage || hasHeal) ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {hasAttack ? (
                  <Button size="small" variant="outlined"
                    onClick={rollAtk}
                    sx={{ ...inlineButtonSx, borderColor: 'rgba(77,149,214,0.4)', color: '#4d95d6' }}>
                    <Sword size={12} style={{ marginRight: 2 }} /> Hit {fbonus(atk)}
                  </Button>
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
              </Box>
            ) : null}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '3px', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '3px', flexWrap: 'wrap' }}>
            {entry.sourceInfo ? <Badge label={entry.sourceInfo.label + (beamBonus ? ` ${beamBonus >= 0 ? '+' : ''}${beamBonus}` : '')} color={entry.sourceInfo.color || '#9d7fb8'} bg="rgba(157,127,184,0.16)" /> : null}
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
        <FreeCastsInline freeCasts={entry.freeCasts} freeCastUses={freeCastUses} onToggleFreeCast={onToggleFreeCast} />
      </Box>

      {open ? (
        <Box sx={spellBodySx}>
          {metaLine ? <Box sx={{ fontSize: '0.65rem', color: 'text.secondary', mb: '5px' }}>{metaLine}</Box> : null}
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
          {higherBlocks.length ? (
            <Box sx={{ mt: 1, pt: 1, borderTop: '1px dashed', borderColor: 'divider' }}>
              <Box sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', color: '#9d7fb8', mb: 0.5 }}>Higher Level</Box>
              <EntryBlocks blocks={higherBlocks} />
            </Box>
          ) : null}
        </Box>
      ) : null}
    </Box>
  );
}
