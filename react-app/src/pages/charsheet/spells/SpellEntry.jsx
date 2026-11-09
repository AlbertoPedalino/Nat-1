import { useMemo } from 'react';
import {
  alpha,
  Box,
  Stack,
  Typography,
} from '@mui/material';
import { SpellNameIcon } from '../../../shared/content/FiveEToolsLink.jsx';
import { EntryBlocks } from '../../../shared/content/EntryBlocks.jsx';
import {
  SpellMetaGrid,
  HigherLevelBlock,
} from '../../../shared/character/spells/SpellReference.jsx';
import MiniBadge from '../../../shared/ui/MiniBadge.jsx';
import { ExpandableCard } from '../../../shared/ui/ExpandableCard.jsx';
import { formatRollTitle } from '../../../shared/character/dice/dice.js';
import { getFinal, getMod } from '../../../shared/character/sheet/sheetStats.js';
import { describeAttackRoll } from '../../../shared/character/combat/conditions.js';
import { getSpellAttackAdvantage } from '../../../shared/character/sheet/effectBonuses.js';
import { entriesToTextBlocks } from '../../../shared/content/entryText.js';
import { getCastBadge, getSpellStatusChips } from './spellBadges.js';
import { getSpellAbilityForEntry } from './spellAbility.js';
import {
  applySpellModifiers,
  getResolvedCantripData,
  collectSpellRiders,
  resolveDmgBonusValue,
} from './spellModifiers.js';
import {
  cantripScalingDamages,
  cantripScalingDice,
  computeScaledFormula,
  extractDamageDice,
  getUpcastStep,
} from './spellDice.js';
import { inlineButtonSx, spellBodySx, spellRowSx } from './spellsTabStyles.js';
import AttackRollButton from '../actions/AttackRollButton.jsx';
import { isConcentrationSpell, isRitualSpell } from '../../../shared/character/spells/spellTags.js';
import {
  CHIP_TONES,
  ENTITY_COLORS,
  RICH_TEXT_ACCENT,
  SPELL_TAG_COLORS,
} from '../../../shared/ui/entityColors.js';
import { useSheetActions } from '../state/SheetActionsContext.jsx';
import RollerButtons from '../../../shared/character/dice/RollerButtons.jsx';
import SummonedCreaturePanel from '../forms/SummonedCreaturePanel.jsx';
import CollapsibleNote from '../../../shared/ui/CollapsibleNote.jsx';
import { spellWeaponAttack, spellWeaponOptions } from '../actions/weaponActions.js';
import { useProficiencySets } from '../proficiency/ProficiencySetsContext.jsx';
import { signed } from '../../../shared/ui/numberFormat.js';
import { UI_COLORS, uiAlpha } from '../../../shared/ui/colors.js';
import { UI_FONTS, FONT_SIZES, LETTER_SPACINGS } from '../../../shared/ui/fonts.js';
import { spellcastingNumbers } from '../../../shared/character/spells/spellcastingNumbers.js';
import { applyFlatToFormula, normalizeModifierDetails, groupModifierDetails } from './spellEntryDetails.js';
import { SourceBadge, FreeCastsInline, SpellWeaponPicker } from './SpellEntryParts.jsx';

export default function SpellEntry({
  entry,
  C,
  exhaustionLevel = 0,
  activeConditions = [],
  adapterRegistry,
  freeCastUses,
  inventory = [],
}) {
  const { onRoll, onShowToast, onToggleFreeCast, onUpdateCharacter } = useSheetActions();
  const profSets = useProficiencySets();
  const castLevel = entry.castLevel || entry.level || 0;
  const baseLevel = entry.level || 0;
  const bodyBlocks = entriesToTextBlocks(entry.descriptionEntries || entry.entries);
  const higherEntries = entry.higherLevelEntries || entry.entriesHigherLevel;
  const characterLevel = Number(C?.level || C?.classLevel || 1);
  const textDamages = extractDamageDice(entry.entries || []);
  const spellAbility = getSpellAbilityForEntry(C, entry);
  const spellNumbers = spellcastingNumbers(C, spellAbility, { inventory });
  const spellMod = spellNumbers.abilityModifier;
  // A cantrip that deals damage rolls the dice of the character's level: the
  // description holds only the level-1 dice.
  const scaledCantripDamages = baseLevel === 0 && textDamages.length
    ? cantripScalingDamages(entry.scalingLevelDice, characterLevel)
    : [];
  const rawDamages = scaledCantripDamages.length ? scaledCantripDamages : textDamages;
  const hasAttack = !!entry.spellAttack;
  const spellData = adapterRegistry.getSpellData(entry.name);
  const hasConcentrationTag = entry?.spellOverrides?.concentration === false
    ? false
    : (isConcentrationSpell(entry) || isConcentrationSpell(spellData));
  const hasRitualTag = isRitualSpell(entry) || isRitualSpell(spellData);
  const ritualOnly = !!entry.ritualOnly || entry.sourceInfo?.kind === 'ritualBook';
  const hasHeal = !!spellData?.heal;
  const rawHealFormula = hasHeal ? (spellData?.baseDie || (rawDamages.length > 0 ? rawDamages[0].formula : null)) : null;
  const damages = hasHeal ? [] : rawDamages;
  const hasDamage = damages.length > 0;
  const steps = castLevel - baseLevel;

  // Per-entry casting ability + global magic-item spell-attack bonus (matches the
  // SpellsTab header so the button and the summary agree).
  // Read from a Spell Scroll, the scroll's own numbers apply instead.
  const atk = entry.scroll ? entry.scroll.attack : spellNumbers.attack;
  const resolvedSpellSaveDc = entry.scroll ? entry.scroll.dc : spellNumbers.dc;

  // Spell-attack advantage/disadvantage. Sources: effect-based advantage scoped
  // to this spell's owning class (e.g. Sorcerer Innate Sorcery) + condition-based
  // adv/disadv that applies to any attack roll (Frightened, Invisible, Prone, …).
  // Same resolver as the weapon attacks in ActionsTab, so spell and weapon
  // attacks stay aligned.
  const innateSpellAdv = hasAttack ? getSpellAttackAdvantage(C, { ownerClassName: entry.ownerClassName }) : null;
  const spellAttackRoll = describeAttackRoll(activeConditions, { extraAdv: innateSpellAdv?.source || null });

  const upcastStepDie = (steps > 0) ? (spellData?.upcastDie || getUpcastStep(entry.entriesHigherLevel)?.stepDie) : null;
  const baseScaledDamages = upcastStepDie
    ? damages.map(d => ({ ...d, formula: computeScaledFormula(d.formula, upcastStepDie, steps) }))
    : damages;

  // Conditional, character-driven extras (e.g. Stars Druid Chalice): each rider
  // contributes an optional roller, tag, and description. Generic — the logic
  // lives in collectSpellRiders, this component just renders the parts.
  const spellRiders = collectSpellRiders(C, { hasHeal, hasDamage, entry });

  const cantripData = baseLevel === 0 ? getResolvedCantripData(C, entry.name) : null;
  const entryData = cantripData || spellData;
  const utilityDie = entryData?.utilityDie || null;
  const utilityLabel = entryData?.utilityLabel || 'Roll';
  const modifierDetails = normalizeModifierDetails({
    ...(cantripData || {}),
    grantModifiers: [
      ...(entry.grantModifiers || []),
      ...spellRiders.flatMap((rider) => rider.modifierDetails || []),
    ],
  });
  const modifierDetailGroups = groupModifierDetails(modifierDetails);
  const detailTagLabels = modifierDetails.map((item) => item.tagLabel).filter(Boolean);
  const modifierTags = Array.from(new Set([...(cantripData?.modifierTags || []), ...detailTagLabels]));
  const beamCount = typeof cantripData?.beamCount === 'function'
    ? Math.max(1, Number(cantripData.beamCount(characterLevel) || 1))
    : 1;
  const beamBonus = resolveDmgBonusValue(C, cantripData?.dmgBonusPerBeam, getMod, getFinal);

  // A spell made as an attack with a weapon (True Strike): the weapon picked in
  // the expanded card rolls its own attack and damage with the spellcasting
  // ability, and the cantrip's extra dice join the damage roll.
  const weaponAttack = !!cantripData?.weaponAttack;
  const weaponOptions = useMemo(
    () => (weaponAttack ? spellWeaponOptions(C, inventory, profSets) : []),
    [C, inventory, profSets, weaponAttack],
  );
  const pickedKey = C?.spellWeapons?.[entry.name];
  const pickedWeapon = weaponOptions.find((option) => option.key === pickedKey) || weaponOptions[0] || null;
  const weaponStrike = pickedWeapon
    ? spellWeaponAttack(C, pickedWeapon.item, {
        ability: spellAbility,
        inventory,
        extraDamage: cantripScalingDice(entry.scalingLevelDice, characterLevel),
      })
    : null;
  const weaponStrikeRoll = weaponStrike
    ? describeAttackRoll(activeConditions, { extraDisadv: weaponStrike.disadvantage })
    : null;

  const expandedBeams = baseScaledDamages.flatMap((dmg, idx) => {
    const baseLabel = dmg.title || (baseScaledDamages.length > 1 ? `Damage ${idx + 1}` : 'Damage');
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
  const spellRollers = weaponAttack ? (weaponStrike?.damageFormula ? [{
    key: 'weapon-damage',
    kind: 'damage',
    formula: weaponStrike.damageFormula,
    title: `Damage (${weaponStrike.damageType ? `${weaponStrike.damageType} or ` : ''}radiant)`,
  }] : []) : [
    ...scaledDamages.map((damage, index) => ({
      key: `damage-${index}`,
      kind: 'damage',
      formula: damage.formula,
      label: beamCount > 1 ? `Beam ${index + 1} ${damage.formula}` : undefined,
      title: damage.label || `Damage ${index + 1}`,
    })),
    ...(hasHeal && healDisplayFormula
      ? [{ key: 'heal', kind: 'heal', formula: healDisplayFormula }]
      : []),
    ...spellRiders.flatMap((rider) => rider.rollers || []),
    ...(utilityDie && !hasDamage && !hasHeal
      ? [{
          key: 'utility',
          kind: 'utility',
          formula: utilityDie,
          label: `${utilityLabel} ${utilityDie}`,
          title: utilityLabel,
        }]
      : []),
  ];
  // Only controls inside the expanded body warrant a separate description
  // disclosure. Header dice buttons and persistent use counters do not.
  const hasInteractiveContent = Boolean(spellData?.summonedCreature) || weaponAttack;
  const descriptionNode = (
    <>
      <EntryBlocks blocks={bodyBlocks} />
      <HigherLevelBlock entries={higherEntries} />
    </>
  );

  return (
    <ExpandableCard
      containerSx={{ mb: '4px', overflow: 'hidden' }}
      detailsSx={{ ...spellBodySx, mt: 0, mb: 0 }}
      summary={({ toggle, open }) => (
        <Box onClick={toggle}
          sx={{ ...spellRowSx, mb: 0, borderRadius: open || hasFreeCasts ? '8px 8px 0 0' : 1, flexDirection: 'column', gap: '3px', alignItems: 'stretch' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
          <SpellNameIcon spell={entry} />
          <Typography noWrap sx={{ overflow: 'hidden', minWidth: 0, fontSize: FONT_SIZES.xxl, color: 'text.primary', textOverflow: 'ellipsis' }}>{entry.name}</Typography>
          {castLevel > baseLevel ? <MiniBadge label={`Lv.${castLevel}`} color={ENTITY_COLORS.class} bg={alpha(ENTITY_COLORS.class, 0.14)} /> : null}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px', ml: 'auto', flexShrink: 0 }}>
            {(hasAttack || weaponStrike || spellRollers.length > 0) ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {weaponStrike ? (
                  <AttackRollButton
                    rawBonus={weaponStrike.attackBonus}
                    exhaustionLevel={exhaustionLevel}
                    label={formatRollTitle(entry.name, `${weaponStrike.name} Attack`)}
                    advArg={weaponStrikeRoll.advArg}
                    sources={weaponStrikeRoll.sources}
                    tag={weaponStrikeRoll.tag}
                    tooltip={weaponStrikeRoll.tooltip}
                    disadv={weaponStrikeRoll.disadv}
                    onRoll={onRoll}
                  />
                ) : null}
                {hasAttack && !weaponAttack ? (
                  <AttackRollButton
                    rawBonus={atk}
                    exhaustionLevel={exhaustionLevel}
                    label={formatRollTitle(entry.name, `Spell Attack${levelLabel}`)}
                    advArg={spellAttackRoll.advArg}
                    sources={spellAttackRoll.sources}
                    tag={spellAttackRoll.tag}
                    tooltip={spellAttackRoll.tooltip}
                    disadv={spellAttackRoll.disadv}
                    onRoll={onRoll}
                  />
                ) : null}
                <RollerButtons
                  rollers={spellRollers}
                  subject={entry.name}
                  titleSuffix={levelLabel}
                  onShowToast={onShowToast}
                  buttonSx={inlineButtonSx}
                />
              </Box>
            ) : null}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '3px', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '3px', flexWrap: 'wrap' }}>
            <SourceBadge sourceInfo={entry.sourceInfo} sources={entry.sources} suffix={beamBonus ? ` ${signed(beamBonus)}` : ''} />
            {weaponStrike ? (
              <MiniBadge label={weaponStrike.name} color={CHIP_TONES.info} bg={alpha(CHIP_TONES.info, 0.16)} />
            ) : null}
            {modifierTags.map(function (tag) { return <MiniBadge key={tag} label={tag} color={UI_COLORS.purple} bg={uiAlpha(UI_COLORS.purple, 0.16)} />; })}
            {spellRiders.filter((rider) => rider.tag).map((rider) => (
              <MiniBadge key={rider.id} label={rider.tag.label} color={rider.tag.color} bg={alpha(rider.tag.color, 0.16)} />
            ))}
            {getSpellStatusChips(entry).map((chip) => <MiniBadge key={chip.key} label={chip.label} color={chip.color} bg={chip.bg} />)}
            {ritualOnly ? <MiniBadge label="Ritual only" color={SPELL_TAG_COLORS.ritual} bg={alpha(SPELL_TAG_COLORS.ritual, 0.16)} /> : null}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
            {beamCount > 1 ? <MiniBadge label={`${beamCount} beams`} color={UI_COLORS.purple} bg={uiAlpha(UI_COLORS.purple, 0.16)} /> : null}
            {hasConcentrationTag ? <MiniBadge label="C" color={SPELL_TAG_COLORS.concentration} bg={alpha(SPELL_TAG_COLORS.concentration, 0.16)} /> : null}
            {hasRitualTag ? <MiniBadge label="R" color={SPELL_TAG_COLORS.ritual} bg={alpha(SPELL_TAG_COLORS.ritual, 0.16)} /> : null}
            <MiniBadge {...getCastBadge(entry)} />
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
          {hasInteractiveContent ? <CollapsibleNote>{descriptionNode}</CollapsibleNote> : descriptionNode}
          {weaponAttack ? (
            <SpellWeaponPicker
              spellName={entry.name}
              options={weaponOptions}
              selectedKey={pickedWeapon?.key || ''}
              onUpdateCharacter={onUpdateCharacter}
            />
          ) : null}
          {spellData?.summonedCreature ? (
            <SummonedCreaturePanel
              descriptor={spellData.summonedCreature}
              character={C}
              castLevel={castLevel}
              abilityMod={spellMod}
              spellAttackBonus={atk}
              spellSaveDc={resolvedSpellSaveDc}
            />
          ) : null}
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
                      fontFamily: UI_FONTS.display,
                      fontSize: FONT_SIZES.xs,
                      fontWeight: 700,
                      letterSpacing: LETTER_SPACINGS.lg,
                      color: RICH_TEXT_ACCENT,
                      lineHeight: 1.15,
                    }}
                  >
                    {group.label}
                  </Typography>
                  <Stack spacing={0.55} sx={{ mt: 0.45 }}>
                    {group.items.map((modifier) => (
                      <Box key={modifier.key || modifier.label}>
                        <Typography sx={{ fontSize: FONT_SIZES.md, fontWeight: 700, lineHeight: 1.2 }}>
                          {modifier.detailTitle || modifier.tagLabel || modifier.label}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.3, mt: 0.1 }}>
                          {modifier.detailText || modifier.description}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              ))}
            </Stack>
          ) : null}
        </>
      )}
    />
  );
}
