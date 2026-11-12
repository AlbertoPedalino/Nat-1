import { useMemo, useState } from 'react';
import { Button } from '@mui/material';
import { PawPrint } from 'lucide-react';
import { getChoiceValue } from '../../../shared/character/progression/choiceUtils.js';
import { classLevel } from '../../../shared/character/progression/classLevel.js';
import {
  findSummonedCreature,
  getSummonedCreatureTypeChoices,
  getSummonedCreatureVersions,
  normalizeSummonedCreature,
} from '../../../shared/character/forms/summonedCreatures.js';
import { useSummonedCreatureRecords } from './useSummonedCreatureRecords.js';
import { useCreatureRolls } from './useCreatureRolls.js';
import { BeastTitle, BeastStatBlock, CreatureOptionRow } from './BeastStatBlock.jsx';
import { signed } from '../../../shared/ui/numberFormat.js';
import { capitalize } from '../../../shared/ui/textCase.js';
import { UI_COLORS, uiAlpha, OPACITY } from '../../../shared/ui/colors.js';
import { tintedSurfaceSx } from '../../../shared/ui/surfaces.js';
import { spellcastingNumbers } from '../../../shared/character/spells/spellcastingNumbers.js';
import { FONT_SIZES, LINE_HEIGHTS } from '../../../shared/ui/fonts.js';
import DetailPanel, { DetailNote, detailStatus } from '../layout/DetailPanel.jsx';
import ChoiceToggle from '../../../shared/ui/ChoiceToggle.jsx';
import SelectField from '../../../shared/ui/SelectField.jsx';

function variantToken(name) {
  return String(name || '').match(/\(([^)]+)\)\s*$/)?.[1] || String(name || '');
}

export default function SummonedCreaturePanel({
  action,
  character,
  descriptor,
  castLevel,
  abilityMod,
  spellAttackBonus,
  spellSaveDc,
  resources,
  onResChange,
}) {
  const config = descriptor || action?.summonedCreature || {};
  const { records, status } = useSummonedCreatureRecords();
  const { rollCheck, rollFormulaToast } = useCreatureRolls();
  const [selectedVersion, setSelectedVersion] = useState('');
  const [selectedCreatureType, setSelectedCreatureType] = useState('');
  const [selectedSpellLevel, setSelectedSpellLevel] = useState(null);

  const raw = useMemo(
    () => findSummonedCreature(records, config.name, config.source || 'AU'),
    [records, config.name, config.source],
  );
  const versions = useMemo(() => getSummonedCreatureVersions(raw), [raw]);
  const choiceValue = config.variantChoiceKey
    ? getChoiceValue(character, config.variantChoiceKey)
    : '';
  const choiceMatch = choiceValue
    ? versions.find((version) => variantToken(version.name).toLowerCase() === String(choiceValue).toLowerCase())
    : null;
  const selected = versions.find((version) => version.name === selectedVersion);
  const activeVersion = choiceMatch || selected || versions[0] || null;
  const creatureTypeChoices = useMemo(
    () => getSummonedCreatureTypeChoices(activeVersion?.record),
    [activeVersion],
  );
  const activeCreatureType = creatureTypeChoices.includes(selectedCreatureType)
    ? selectedCreatureType
    : (creatureTypeChoices[0] || '');

  const resolvedClassLevel = config.levelClass ? classLevel(character, config.levelClass) : 0;
  // The casting spell's numbers when it passes them, else the caster's own.
  const ownNumbers = spellcastingNumbers(character, config.ability || 'cha');
  const resolvedAbilityMod = Number.isFinite(Number(abilityMod)) ? Number(abilityMod) : ownNumbers.abilityModifier;
  const resolvedAttack = Number.isFinite(Number(spellAttackBonus)) ? Number(spellAttackBonus) : ownNumbers.attack;
  const resolvedDc = Number.isFinite(Number(spellSaveDc)) ? Number(spellSaveDc) : ownNumbers.dc;
  const incomingSpellLevel = Math.max(
    Number(config.minimumSpellLevel || 0),
    Number(castLevel || config.minimumSpellLevel || 0),
  );
  const resolvedSpellLevel = config.levelClass
    ? incomingSpellLevel
    : Math.max(Number(config.minimumSpellLevel || 0), Number(selectedSpellLevel || incomingSpellLevel));
  const creature = useMemo(() => normalizeSummonedCreature(activeVersion?.record, {
    spellLevel: resolvedSpellLevel,
    classLevel: resolvedClassLevel,
    abilityMod: resolvedAbilityMod,
    spellAttackBonus: resolvedAttack,
    spellSaveDc: resolvedDc,
    creatureType: activeCreatureType,
  }), [activeVersion, resolvedSpellLevel, resolvedClassLevel, resolvedAbilityMod, resolvedAttack, resolvedDc, activeCreatureType]);
  const divinePowerKey = config.divinePowerResourceKey;
  const divinePowerAvailable = divinePowerKey
    ? Number(resources?.[divinePowerKey] ?? 1) > 0
    : false;
  const divinePowerAccessory = divinePowerKey
    ? (item) => (/^Divine Power\b/i.test(item.name)
      ? (
        <DivinePowerStatusButton
          available={divinePowerAvailable}
          onToggle={typeof onResChange === 'function'
            ? () => onResChange(divinePowerKey, divinePowerAvailable ? -1 : 1)
            : null}
        />
      )
      : null)
    : null;

  const panelStatus = detailStatus(status, creature);
  if (panelStatus) {
    return (
      <DetailPanel
        status={panelStatus}
        loadingLabel="Loading summoned statblock…"
        unavailableText="Summoned statblock unavailable."
      />
    );
  }

  const hasFixedChoice = Boolean(choiceMatch);
  return (
    <DetailPanel icon={PawPrint} titleNode={<BeastTitle name={creature.name} source={creature.source} />}>
      {versions.length > 1 ? (
        <CreatureOptionRow label="Form">
          <ChoiceToggle
            size="xs"
            wrap
            stopPropagation
            value={activeVersion?.name || ''}
            onChange={(name) => { if (!hasFixedChoice) setSelectedVersion(name); }}
            options={versions.map((version) => ({ value: version.name, label: variantToken(version.name), disabled: hasFixedChoice }))}
          />
        </CreatureOptionRow>
      ) : null}
      {creatureTypeChoices.length > 1 ? (
        <CreatureOptionRow label="Creature Type">
          <ChoiceToggle
            size="xs"
            wrap
            stopPropagation
            value={activeCreatureType}
            onChange={setSelectedCreatureType}
            options={creatureTypeChoices.map((type) => ({ value: type, label: capitalize(type || 'Creature') }))}
          />
        </CreatureOptionRow>
      ) : null}
      {!config.levelClass && config.minimumSpellLevel ? (
        <SelectField
          label="Spell Slot"
          value={resolvedSpellLevel}
          onChange={(value) => setSelectedSpellLevel(Number(value))}
          stopPropagation
          options={Array.from(
            { length: 10 - Number(config.minimumSpellLevel) },
            (_, index) => Number(config.minimumSpellLevel) + index,
          ).map((level) => ({ value: level, label: `Level ${level}` }))}
          fullWidth={false}
          sx={{ mb: 0.75, minWidth: 130 }}
        />
      ) : null}
      <BeastStatBlock
        b={creature}
        typeLabel={capitalize(creature.type || 'Creature')}
        showCr={false}
        onRoll={rollCheck}
        onRollFormula={rollFormulaToast}
        bonusActionAccessory={divinePowerAccessory}
      />
      <DetailNote>
        {config.levelClass
          ? `Scaled for ${config.levelClass} level ${resolvedClassLevel}.`
          : `Scaled for a level ${resolvedSpellLevel} spell slot.`}
        {' '}Attack {signed(resolvedAttack)}; save DC {resolvedDc}.
      </DetailNote>
    </DetailPanel>
  );
}

export function DivinePowerStatusButton({ available, onToggle }) {
  const label = available ? 'Available' : 'Used';
  return (
    <Button
      type="button"
      size="small"
      variant="outlined"
      aria-label={available ? 'Mark Divine Power as used' : 'Restore Divine Power'}
      aria-pressed={!available}
      onClick={onToggle ? (event) => { event.stopPropagation(); onToggle(); } : undefined}
      sx={{
        minWidth: 0,
        ml: 0.5,
        px: 0.75,
        py: 0,
        verticalAlign: 'baseline',
        fontSize: FONT_SIZES.xxs,
        lineHeight: LINE_HEIGHTS.normal,
        textTransform: 'none',
        color: available ? UI_COLORS.successText : UI_COLORS.dangerMuted,
        borderColor: available ? uiAlpha(UI_COLORS.success, OPACITY.strong) : uiAlpha(UI_COLORS.dangerMuted, OPACITY.strong),
        // Washed over the outlined button's own raised surface, so it stays solid.
        ...tintedSurfaceSx(available ? UI_COLORS.success : UI_COLORS.dangerMuted, { amount: OPACITY.soft, base: UI_COLORS.surfaceRaised }),
        '&:hover': {
          borderColor: available ? UI_COLORS.successText : UI_COLORS.dangerMuted,
          ...tintedSurfaceSx(available ? UI_COLORS.success : UI_COLORS.dangerMuted, { amount: OPACITY.fill, base: UI_COLORS.surfaceRaised }),
        },
      }}
    >
      {label}
    </Button>
  );
}
