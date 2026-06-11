import { useState } from 'react';
import { Box, Chip, Collapse, IconButton, List, ListItemButton, ListItemText, Paper, Stack, Typography } from '@mui/material';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { EntryBlocks } from '../../../shared/character/EntryBlocks.jsx';
import {
  parseTypedProficiencyValue,
  isChoicePlaceholderValue,
  normalizedKey,
} from '../../../shared/character/typedProficiencies.js';

const CHOICE_KEYS = ['choose', 'any', 'anyTool', 'anyArtisansTool', 'anyMusicalInstrument', 'anyGamingSet', 'anyStandard', 'anyExotic'];

function parseTypedChoiceValue(value) {
  const parsed = parseTypedProficiencyValue(value);
  return { kind: parsed.kind, label: parsed.label, norm: normalizedKey(parsed.label) };
}

function proficiencyBlockKey(kind, value) {
  const parsed = parseTypedChoiceValue(value);
  const resolvedKind = parsed.kind || kind;
  if (!resolvedKind || !parsed.norm) return '';
  return `${resolvedKind}:${parsed.norm}`;
}

function addProficiencyBlock(out, value, kind) {
  const key = proficiencyBlockKey(kind, value);
  if (key) out.add(key);
}

function isChoicePlaceholder(value) {
  return isChoicePlaceholderValue(value);
}

function choiceKeyMayContainKind(key, kind) {
  const raw = String(key || '').toLowerCase();
  if (raw.includes('skill_tool')) return kind === 'skill' || kind === 'tool';
  return keyProficiencyKind(key) === kind;
}

function choiceKeyIsExpertise(key) {
  const raw = String(key || '').toLowerCase();
  return raw.includes('expertise') || raw.includes('_exp_') || raw.endsWith('_exp');
}

function specProficiencyKind(spec) {
  const key = String(spec?.key || '').toLowerCase();
  const label = String(spec?.label || '').toLowerCase();
  if (spec?.type === 'skill_tool_choice') return 'mixed';
  if (spec?.type === 'expertise') return null;
  if (spec?.type === 'skill_choice' || key.includes('skill')) return 'skill';
  if (spec?.type === 'language_choice' || key.includes('language') || key.includes('lang')) return 'language';
  if (key.includes('tool') || label.includes('tool') || label.includes('instrument')) return 'tool';
  if (key.includes('weapon') || label.includes('weapon proficiency')) return 'weapon';
  return null;
}

function keyProficiencyKind(key) {
  const raw = String(key || '').toLowerCase();
  if (raw.includes('skill_tool')) return 'mixed';
  if (raw.includes('skill')) return 'skill';
  if (raw.includes('language') || raw.includes('lang')) return 'language';
  if (raw.includes('tool') || raw.includes('instrument')) return 'tool';
  if (raw.includes('weapon')) return 'weapon';
  return null;
}

function addFixedBlocks(out, blocks, kind) {
  (Array.isArray(blocks) ? blocks : [blocks]).forEach((block) => {
    if (!block) return;
    if (typeof block === 'string') {
      block.split(/[;,]/).forEach((value) => {
        if (!value.trim() || isChoicePlaceholder(value)) return;
        addProficiencyBlock(out, value, kind);
      });
      return;
    }
    Object.keys(block)
      .filter((key) => !CHOICE_KEYS.includes(key) && block[key] !== false && !isChoicePlaceholder(key))
      .forEach((key) => addProficiencyBlock(out, key, kind));
  });
}

function addChoiceValueToKindSet(out, value, kind) {
  const parsed = parseTypedChoiceValue(value);
  if (parsed.kind && parsed.kind !== kind) return;
  if (isChoicePlaceholder(parsed.label)) return;
  addProficiencyBlock(out, parsed.label, kind);
}

function collectBlockedForKind({ character, choices, currentKey, kind }) {
  const blocked = new Set();

  Object.entries(choices || {}).forEach(([key, value]) => {
    if (key === currentKey || !choiceKeyMayContainKind(key, kind)) return;
    (Array.isArray(value) ? value : [value]).forEach((item) => addChoiceValueToKindSet(blocked, item, kind));
  });

  if (!character) return blocked;

  if (kind === 'skill') {
    (Array.isArray(character.selectedSkills)
      ? character.selectedSkills
      : [
        ...(character.selectedSkills?.proficient || []),
        ...(character.selectedSkills?.expertise || []),
        ...(character.selectedSkills?.expert || []),
      ]
    ).forEach((item) => addChoiceValueToKindSet(blocked, item, 'skill'));
    (character.normalizedChoices?.skills || []).forEach((item) => addChoiceValueToKindSet(blocked, item, 'skill'));
    addFixedBlocks(blocked, character.backgroundObj?.skillProficiencies || character.backgroundSnapshot?.skillProficiencies, 'skill');
    addFixedBlocks(blocked, character.speciesObj?.skillProficiencies || character.speciesSnapshot?.skillProficiencies, 'skill');
  }

  if (kind === 'tool') {
    (character.selectedTools || []).forEach((item) => addChoiceValueToKindSet(blocked, item, 'tool'));
    (character.normalizedChoices?.tools || []).forEach((item) => addChoiceValueToKindSet(blocked, item, 'tool'));
    addFixedBlocks(blocked, character.cls?.startingProficiencies?.tools || character.clsSnapshot?.startingProficiencies?.tools, 'tool');
    addFixedBlocks(blocked, character.cls?.startingProficiencies?.toolProficiencies || character.clsSnapshot?.startingProficiencies?.toolProficiencies, 'tool');
    addFixedBlocks(blocked, character.backgroundObj?.toolProficiencies || character.backgroundSnapshot?.toolProficiencies, 'tool');
    addFixedBlocks(blocked, character.speciesObj?.toolProficiencies || character.speciesSnapshot?.toolProficiencies, 'tool');
  }

  if (kind === 'language') {
    (character.selectedLanguages || []).forEach((item) => addChoiceValueToKindSet(blocked, item, 'language'));
    (character.normalizedChoices?.languages || []).forEach((item) => addChoiceValueToKindSet(blocked, item, 'language'));
    addFixedBlocks(blocked, character.cls?.startingProficiencies?.languages || character.clsSnapshot?.startingProficiencies?.languages, 'language');
    addFixedBlocks(blocked, character.cls?.startingProficiencies?.languageProficiencies || character.clsSnapshot?.startingProficiencies?.languageProficiencies, 'language');
    addFixedBlocks(blocked, character.backgroundObj?.languageProficiencies || character.backgroundSnapshot?.languageProficiencies, 'language');
    addFixedBlocks(blocked, character.speciesObj?.languageProficiencies || character.speciesSnapshot?.languageProficiencies, 'language');
  }

  if (kind === 'weapon') {
    addFixedBlocks(blocked, character.cls?.startingProficiencies?.weapons || character.clsSnapshot?.startingProficiencies?.weapons, 'weapon');
    addFixedBlocks(blocked, character.cls?.startingProficiencies?.weaponProficiencies || character.clsSnapshot?.startingProficiencies?.weaponProficiencies, 'weapon');
  }

  [
    ...(character.allFeatures || []),
    ...(character.allSubFeatures || []),
    ...((character.extraClasses || []).flatMap((extra) => [...(extra.allFeatures || []), ...(extra.allSubFeatures || [])])),
  ].forEach((feature) => {
    if (kind === 'skill') addFixedBlocks(blocked, feature.skillProficiencies, 'skill');
    if (kind === 'tool') addFixedBlocks(blocked, feature.toolProficiencies, 'tool');
    if (kind === 'language') addFixedBlocks(blocked, feature.languageProficiencies, 'language');
    if (kind === 'weapon') addFixedBlocks(blocked, feature.weaponProficiencies, 'weapon');
  });

  return blocked;
}

function collectBlockedProficiencies({ character, choices, currentKey, kind }) {
  const kinds = kind === 'mixed' ? ['skill', 'tool'] : [kind];
  return kinds.reduce((out, entryKind) => {
    collectBlockedForKind({ character, choices, currentKey, kind: entryKind }).forEach((value) => out.add(value));
    return out;
  }, new Set());
}

function collectCurrentProficientSkills({ character, choices }) {
  const skills = new Set();
  const addSkill = (value) => addChoiceValueToKindSet(skills, value, 'skill');

  const selectedSkills = character?.selectedSkills;
  (Array.isArray(selectedSkills)
    ? selectedSkills
    : [
      ...(selectedSkills?.proficient || []),
      ...(selectedSkills?.expertise || []),
      ...(selectedSkills?.expert || []),
    ]
  ).forEach(addSkill);

  (character?.normalizedChoices?.skills || []).forEach(addSkill);
  (character?.normalizedChoices?.expertise || []).forEach(addSkill);

  addFixedBlocks(skills, character?.backgroundObj?.skillProficiencies || character?.backgroundSnapshot?.skillProficiencies, 'skill');
  addFixedBlocks(skills, character?.speciesObj?.skillProficiencies || character?.speciesSnapshot?.skillProficiencies, 'skill');

  [
    ...(character?.allFeatures || []),
    ...(character?.allSubFeatures || []),
    ...((character?.extraClasses || []).flatMap((extra) => [...(extra.allFeatures || []), ...(extra.allSubFeatures || [])])),
  ].forEach((feature) => addFixedBlocks(skills, feature.skillProficiencies, 'skill'));

  Object.entries(choices || {}).forEach(([key, value]) => {
    if (choiceKeyIsExpertise(key)) return;
    if (!choiceKeyMayContainKind(key, 'skill')) return;
    (Array.isArray(value) ? value : [value]).forEach(addSkill);
  });

  return skills;
}

function collectAlreadyExpertiseSkills({ choices, currentKey }) {
  const expertise = new Set();
  Object.entries(choices || {}).forEach(([key, value]) => {
    if (key === currentKey || !choiceKeyIsExpertise(key)) return;
    (Array.isArray(value) ? value : [value]).forEach((item) => addChoiceValueToKindSet(expertise, item, 'skill'));
  });
  return expertise;
}

export default function ChoiceBlock({ spec, choices, dispatch, character, getOptionDescription }) {
  const [expanded, setExpanded] = useState(() => new Set());
  const toggleExpanded = (value) => setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(value)) next.delete(value); else next.add(value);
    return next;
  });
  const selected = Array.isArray(choices[spec.key]) ? choices[spec.key] : (choices[spec.key] ? [choices[spec.key]] : []);
  const proficiencyKind = specProficiencyKind(spec);
  const blockedValues = proficiencyKind
    ? collectBlockedProficiencies({ character, choices, currentKey: spec.key, kind: proficiencyKind })
    : new Set();
  const rawOptions = spec.options?.length
    ? spec.options.map((option) => {
      const value = option.value ?? option.key ?? option.label;
      return {
        value,
        label: option.label ?? parseTypedChoiceValue(value).label,
      };
    })
    : (spec.from || []).map((value) => ({ value, label: parseTypedChoiceValue(value).label }));
  const proficientSkills = spec.type === 'expertise' && spec.requiresProficiency
    ? collectCurrentProficientSkills({ character, choices })
    : null;
  const alreadyExpertise = spec.type === 'expertise' && spec.excludeAlreadyExpertise
    ? collectAlreadyExpertiseSkills({ choices, currentKey: spec.key })
    : null;
  const options = rawOptions.filter(({ value }) => {
    if (spec.type !== 'expertise') return true;
    const parsed = parseTypedChoiceValue(value);
    const active = selected.includes(value);
    const skillKey = proficiencyBlockKey('skill', parsed.label);
    if (spec.requiresProficiency && proficientSkills && !active && !proficientSkills.has(skillKey)) return false;
    if (spec.excludeAlreadyExpertise && alreadyExpertise && !active && alreadyExpertise.has(skillKey)) return false;
    return true;
  });
  const max = spec.count || 1;
  const blockedValuesForReducer = [...new Set([
    ...Array.from(blockedValues),
    ...Array.from(blockedValues).map((value) => value.split(':').slice(1).join(':')).filter(Boolean),
  ])];

  return (
    <Paper variant="outlined" sx={{ p: 1, minWidth: 0 }}>
      <Stack spacing={0.8} sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={0.65} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography
            sx={{
              flex: 1,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: 'text.secondary',
              fontSize: '0.72rem',
              fontWeight: 800,
              lineHeight: 1.25,
            }}
          >
            {spec.label}
          </Typography>
          <Chip size="small" label={`${selected.length}/${max}`} color={selected.length >= max ? 'primary' : 'default'} variant={selected.length >= max ? 'filled' : 'outlined'} />
        </Stack>
        <Paper variant="outlined" sx={{ maxHeight: 210, overflow: 'auto', bgcolor: 'background.default' }}>
          <List dense disablePadding>
            {options.map(({ value, label }) => {
              const active = selected.includes(value);
              const full = !active && selected.length >= max;
              const parsed = parseTypedChoiceValue(value);
              const optionKind = parsed.kind || (proficiencyKind === 'mixed' ? null : proficiencyKind);
              const duplicate = !active && optionKind && blockedValues.has(proficiencyBlockKey(optionKind, parsed.label));
              const desc = getOptionDescription ? getOptionDescription(value) : null;
              const isOpen = expanded.has(value);
              return (
                <Box key={`${spec.key}-${value}`} sx={{ borderBottom: isOpen ? 0 : 1, borderColor: 'divider' }}>
                  <Stack direction="row" alignItems="stretch" sx={{ minWidth: 0 }}>
                    <ListItemButton
                      selected={active}
                      disabled={full || duplicate}
                      onClick={() => dispatch({
                        type: 'choice/toggle-item',
                        key: spec.key,
                        value,
                        max,
                        blockedValues: blockedValuesForReducer,
                      })}
                      sx={{
                        flex: 1,
                        minWidth: 0,
                        py: 0.65,
                        px: 1,
                        '&.Mui-selected': {
                          bgcolor: 'primary.main',
                          color: 'primary.contrastText',
                        },
                        '&.Mui-selected:hover': {
                          bgcolor: 'primary.dark',
                        },
                      }}
                    >
                      <ListItemText
                        primary={
                          <Typography
                            noWrap
                            sx={{
                              color: active ? 'inherit' : 'text.primary',
                              fontSize: '0.82rem',
                              fontWeight: active ? 800 : 500,
                            }}
                          >
                            {label}
                          </Typography>
                        }
                      />
                      {active ? <Check size={16} color="currentColor" /> : null}
                    </ListItemButton>
                    {desc ? (
                      <IconButton
                        size="small"
                        aria-label={isOpen ? 'Collapse description' : 'Expand description'}
                        onClick={() => toggleExpanded(value)}
                        sx={{ borderRadius: 0, color: 'text.secondary' }}
                      >
                        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </IconButton>
                    ) : null}
                  </Stack>
                  {desc ? (
                    <Collapse in={isOpen} unmountOnExit>
                      <Box sx={{ px: 1, py: 0.75, bgcolor: 'background.paper' }}>
                        <EntryBlocks entries={desc} emptyText="" />
                      </Box>
                    </Collapse>
                  ) : null}
                </Box>
              );
            })}
          </List>
        </Paper>
      </Stack>
    </Paper>
  );
}
