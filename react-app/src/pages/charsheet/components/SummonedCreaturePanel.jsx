import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { PawPrint } from 'lucide-react';
import { getChoiceValue } from '../../../shared/character/choiceUtils.js';
import { classLevel } from '../../../shared/character/classLevel.js';
import {
  findSummonedCreature,
  getSummonedCreatureTypeChoices,
  getSummonedCreatureVersions,
  loadSummonedCreatureRecords,
  normalizeSummonedCreature,
} from '../../../shared/character/summonedCreatures.js';
import { buildD20Meta, formatD20Detail, rollD20, rollFormula } from '../../../shared/character/dice.js';
import { getFinal, getMod, getPB } from '../logic/calculations.js';
import { useSheetActions } from '../context/SheetActionsContext.jsx';
import {
  BeastNameLink,
  BeastStatBlock,
  headerSx,
  panelSx,
  subSx,
} from './BeastStatBlock.jsx';

function capitalize(value) {
  const text = String(value || 'Creature');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

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
  const { onShowToast } = useSheetActions();
  const [records, setRecords] = useState([]);
  const [status, setStatus] = useState('loading');
  const [selectedVersion, setSelectedVersion] = useState('');
  const [selectedCreatureType, setSelectedCreatureType] = useState('');
  const [selectedSpellLevel, setSelectedSpellLevel] = useState(null);

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    loadSummonedCreatureRecords()
      .then((result) => {
        if (!alive) return;
        setRecords(result || []);
        setStatus('ready');
      })
      .catch(() => {
        if (!alive) return;
        setRecords([]);
        setStatus('error');
      });
    return () => { alive = false; };
  }, []);

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
  const resolvedAbilityMod = Number.isFinite(Number(abilityMod))
    ? Number(abilityMod)
    : getMod(getFinal(character, config.ability || 'cha'));
  const resolvedAttack = Number.isFinite(Number(spellAttackBonus))
    ? Number(spellAttackBonus)
    : getPB(character) + resolvedAbilityMod;
  const resolvedDc = Number.isFinite(Number(spellSaveDc))
    ? Number(spellSaveDc)
    : 8 + resolvedAttack;
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
  const rollCheck = (bonus, label) => {
    if (!onShowToast) return;
    const result = rollD20(bonus);
    onShowToast(label, formatD20Detail(result), result.total, result.rolls, buildD20Meta(result));
  };
  const rollFormulaToast = (formula, label) => {
    if (!onShowToast) return;
    const result = rollFormula(formula);
    if (!result.valid) {
      onShowToast(label, `Unable to roll ${formula}: ${result.error?.message || 'invalid formula'}`, null, []);
      return;
    }
    onShowToast(
      label,
      formula,
      result.total,
      result.rolls,
      result.modifier ? { bonus: result.modifier } : undefined,
    );
  };
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

  if (status === 'loading') {
    return (
      <Box onClick={(event) => event.stopPropagation()} sx={{ ...panelSx, display: 'flex', alignItems: 'center', gap: 1 }}>
        <CircularProgress size={16} />
        <Typography sx={subSx}>Loading summoned statblock…</Typography>
      </Box>
    );
  }
  if (!creature) {
    return (
      <Box onClick={(event) => event.stopPropagation()} sx={panelSx}>
        <Typography sx={subSx} color={status === 'error' ? 'error.main' : 'text.secondary'}>
          Summoned statblock unavailable.
        </Typography>
      </Box>
    );
  }

  const hasFixedChoice = Boolean(choiceMatch);
  return (
    <Box onClick={(event) => event.stopPropagation()} sx={panelSx}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mb: 0.6 }}>
        <PawPrint size={14} color="#edd48a" />
        <BeastNameLink name={creature.name} source={creature.source} sx={headerSx} />
      </Box>
      {versions.length > 1 ? (
        <CreatureOptionRow label="Form">
          <ToggleButtonGroup
            size="small"
            exclusive
            value={activeVersion?.name || ''}
            onChange={(event, value) => { event.stopPropagation(); if (value && !hasFixedChoice) setSelectedVersion(value); }}
            sx={{ flexWrap: 'wrap' }}
          >
            {versions.map((version) => (
              <ToggleButton key={version.name} value={version.name} disabled={hasFixedChoice} sx={toggleSx}>
                {variantToken(version.name)}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </CreatureOptionRow>
      ) : null}
      {creatureTypeChoices.length > 1 ? (
        <CreatureOptionRow label="Creature Type">
          <ToggleButtonGroup
            size="small"
            exclusive
            value={activeCreatureType}
            onChange={(event, value) => { event.stopPropagation(); if (value) setSelectedCreatureType(value); }}
            sx={{ flexWrap: 'wrap' }}
          >
            {creatureTypeChoices.map((type) => (
              <ToggleButton key={type} value={type} sx={toggleSx}>{capitalize(type)}</ToggleButton>
            ))}
          </ToggleButtonGroup>
        </CreatureOptionRow>
      ) : null}
      {!config.levelClass && config.minimumSpellLevel ? (
        <FormControl size="small" sx={{ mb: 0.8, minWidth: 130 }}>
          <InputLabel>Spell Slot</InputLabel>
          <Select
            label="Spell Slot"
            value={resolvedSpellLevel}
            onChange={(event) => setSelectedSpellLevel(Number(event.target.value))}
            onClick={(event) => event.stopPropagation()}
          >
            {Array.from(
              { length: 10 - Number(config.minimumSpellLevel) },
              (_, index) => Number(config.minimumSpellLevel) + index,
            ).map((level) => <MenuItem key={level} value={level}>Level {level}</MenuItem>)}
          </Select>
        </FormControl>
      ) : null}
      <BeastStatBlock
        b={creature}
        typeLabel={capitalize(creature.type)}
        showCr={false}
        onRoll={rollCheck}
        onRollFormula={rollFormulaToast}
        bonusActionAccessory={divinePowerAccessory}
      />
      <Typography sx={{ ...subSx, mt: 0.6, fontStyle: 'italic' }}>
        {config.levelClass
          ? `Scaled for ${config.levelClass} level ${resolvedClassLevel}.`
          : `Scaled for a level ${resolvedSpellLevel} spell slot.`}
        {' '}Attack {resolvedAttack >= 0 ? '+' : ''}{resolvedAttack}; save DC {resolvedDc}.
      </Typography>
    </Box>
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
        ml: 0.6,
        px: 0.65,
        py: 0,
        verticalAlign: 'baseline',
        fontSize: '0.54rem',
        lineHeight: 1.45,
        textTransform: 'none',
        color: available ? '#a9d6ae' : '#c98a8a',
        borderColor: available ? 'rgba(104,170,113,0.55)' : 'rgba(201,138,138,0.55)',
        bgcolor: available ? 'rgba(104,170,113,0.08)' : 'rgba(201,138,138,0.08)',
        '&:hover': {
          borderColor: available ? '#a9d6ae' : '#c98a8a',
          bgcolor: available ? 'rgba(104,170,113,0.16)' : 'rgba(201,138,138,0.16)',
        },
      }}
    >
      {label}
    </Button>
  );
}

function CreatureOptionRow({ label, children }) {
  return (
    <Box sx={{ mb: 0.8 }}>
      <Typography sx={{ ...subSx, mb: 0.3, fontWeight: 700 }}>{label}</Typography>
      {children}
    </Box>
  );
}

const toggleSx = {
  fontSize: '0.62rem',
  py: '3px',
  px: '8px',
  textTransform: 'none',
  color: '#edd48a',
  borderColor: 'rgba(202,165,80,0.4)',
  '&.Mui-selected': { bgcolor: 'rgba(237,212,138,0.18)', color: '#edd48a' },
};
