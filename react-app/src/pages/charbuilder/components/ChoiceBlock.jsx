import { useState } from 'react';
import { Box, Chip, Collapse, IconButton, List, ListItemButton, ListItemText, Paper, Stack, Typography } from '@mui/material';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { EntryBlocks } from '../../../shared/character/EntryBlocks.jsx';
import { findWeaponItemByName } from '../../../shared/character/weaponMastery.js';
import { WeaponMasteryBlock } from '../../../shared/character/WeaponMasteryBlock.jsx';
import ExpandableSelectionList from './ExpandableSelectionList.jsx';
import SelectionSearch from './SelectionSearch.jsx';
import { useOptionSearch } from '../../../shared/character/searchText.js';
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

function collectBlockedForKind({ character, kind }) {
  const blocked = new Set();
  if (!character) return blocked;

  if (kind === 'skill') {
    (character.normalizedChoices?.skills || []).forEach((item) => addChoiceValueToKindSet(blocked, item, 'skill'));
    addFixedBlocks(blocked, character.backgroundObj?.skillProficiencies || character.backgroundSnapshot?.skillProficiencies, 'skill');
    addFixedBlocks(blocked, character.speciesObj?.skillProficiencies || character.speciesSnapshot?.skillProficiencies, 'skill');
  }

  if (kind === 'tool') {
    (character.normalizedChoices?.tools || []).forEach((item) => addChoiceValueToKindSet(blocked, item, 'tool'));
    addFixedBlocks(blocked, character.cls?.startingProficiencies?.tools || character.clsSnapshot?.startingProficiencies?.tools, 'tool');
    addFixedBlocks(blocked, character.cls?.startingProficiencies?.toolProficiencies || character.clsSnapshot?.startingProficiencies?.toolProficiencies, 'tool');
    addFixedBlocks(blocked, character.backgroundObj?.toolProficiencies || character.backgroundSnapshot?.toolProficiencies, 'tool');
    addFixedBlocks(blocked, character.speciesObj?.toolProficiencies || character.speciesSnapshot?.toolProficiencies, 'tool');
  }

  if (kind === 'language') {
    (character.normalizedChoices?.languages || []).forEach((item) => addChoiceValueToKindSet(blocked, item, 'language'));
    addFixedBlocks(blocked, character.cls?.startingProficiencies?.languages || character.clsSnapshot?.startingProficiencies?.languages, 'language');
    addFixedBlocks(blocked, character.cls?.startingProficiencies?.languageProficiencies || character.clsSnapshot?.startingProficiencies?.languageProficiencies, 'language');
    addFixedBlocks(blocked, character.backgroundObj?.languageProficiencies || character.backgroundSnapshot?.languageProficiencies, 'language');
    addFixedBlocks(blocked, character.speciesObj?.languageProficiencies || character.speciesSnapshot?.languageProficiencies, 'language');
  }

  if (kind === 'weapon') {
    (character.normalizedChoices?.weaponMasteries || []).forEach((item) => addChoiceValueToKindSet(blocked, item, 'weapon'));
    (character.normalizedChoices?.weapons || []).forEach((item) => addChoiceValueToKindSet(blocked, item, 'weapon'));
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

function collectBlockedProficiencies({ character, kind }) {
  const kinds = kind === 'mixed' ? ['skill', 'tool'] : [kind];
  return kinds.reduce((out, entryKind) => {
    collectBlockedForKind({ character, kind: entryKind }).forEach((value) => out.add(value));
    return out;
  }, new Set());
}

function collectCurrentProficientSkills({ character }) {
  const skills = new Set();
  const addSkill = (value) => addChoiceValueToKindSet(skills, value, 'skill');

  // Choice-derived and selected skill proficiencies (including expertise, which is
  // itself a proficiency) all live in normalizedChoices.skills — the single source
  // of truth, rebuilt by the builder reducer on every change.
  (character?.normalizedChoices?.skills || []).forEach(addSkill);

  // Fixed proficiencies from background/species/features aren't choice-derived, so
  // they live outside normalizedChoices and are gathered separately.
  addFixedBlocks(skills, character?.backgroundObj?.skillProficiencies || character?.backgroundSnapshot?.skillProficiencies, 'skill');
  addFixedBlocks(skills, character?.speciesObj?.skillProficiencies || character?.speciesSnapshot?.skillProficiencies, 'skill');

  [
    ...(character?.allFeatures || []),
    ...(character?.allSubFeatures || []),
    ...((character?.extraClasses || []).flatMap((extra) => [...(extra.allFeatures || []), ...(extra.allSubFeatures || [])])),
  ].forEach((feature) => addFixedBlocks(skills, feature.skillProficiencies, 'skill'));

  return skills;
}

// Skills already given expertise, from every source (any expertise choice block,
// selectedSkills, feats), read from the single source of truth. The filter's
// `!active` guard keeps the current block's own picks selectable, so no per-key
// exclusion is needed here.
function collectAlreadyExpertiseSkills({ character }) {
  const expertise = new Set();
  (character?.normalizedChoices?.expertise || []).forEach((item) => addChoiceValueToKindSet(expertise, item, 'skill'));
  return expertise;
}

function isWeaponMasterySpec(spec) {
  const key = String(spec?.key || '').replace(/^mc\d+_/, '').toLowerCase();
  return key.includes('weapon_mastery') || (key.includes('weapon') && key.includes('mastery'));
}

export default function ChoiceBlock({ spec, choices, dispatch, character, getOptionDescription, items = [] }) {
  const [expanded, setExpanded] = useState(() => new Set());
  const weaponMasterySpec = isWeaponMasterySpec(spec);

  const toggleExpanded = (value) => setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(value)) next.delete(value); else next.add(value);
    return next;
  });
  const selected = Array.isArray(choices[spec.key]) ? choices[spec.key] : (choices[spec.key] ? [choices[spec.key]] : []);
  const proficiencyKind = specProficiencyKind(spec);
  const blockedValues = proficiencyKind
    ? collectBlockedProficiencies({ character, kind: proficiencyKind })
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
    ? collectCurrentProficientSkills({ character })
    : null;
  // Expertise never stacks (5e rule), so a skill already given expertise by any
  // other block is excluded everywhere — no per-spec opt-in needed.
  const alreadyExpertise = spec.type === 'expertise'
    ? collectAlreadyExpertiseSkills({ character })
    : null;
  const options = rawOptions.filter(({ value }) => {
    if (spec.type !== 'expertise') return true;
    const parsed = parseTypedChoiceValue(value);
    const active = selected.includes(value);
    const skillKey = proficiencyBlockKey('skill', parsed.label);
    if (spec.requiresProficiency && proficientSkills && !active && !proficientSkills.has(skillKey)) return false;
    if (alreadyExpertise && !active && alreadyExpertise.has(skillKey)) return false;
    return true;
  });
  const { query, setQuery, showSearch, visibleOptions } = useOptionSearch(options);
  const max = spec.count || 1;
  const blockedValuesForReducer = [...new Set([
    ...Array.from(blockedValues),
    ...Array.from(blockedValues).map((value) => value.split(':').slice(1).join(':')).filter(Boolean),
  ])];
  const toggleOption = (value) => dispatch({
    type: 'choice/toggle-item',
    key: spec.key,
    value,
    max,
    blockedValues: blockedValuesForReducer,
  });

  if (weaponMasterySpec) {
    const masteryOptions = options.map(({ value, label }) => {
      const active = selected.includes(value);
      const item = findWeaponItemByName(items, value, '', { supportedOnly: true });
      return {
        key: `${spec.key}-${value}`,
        value,
        label,
        selected: active,
        disabled: !active && selected.length >= max,
        details: <WeaponMasteryBlock mastery={item?.mastery} variant="title" />,
      };
    });

    return (
      <ExpandableSelectionList
        title={spec.label}
        options={masteryOptions}
        selectedCount={selected.length}
        max={max}
        onSelect={(option) => toggleOption(option.value)}
      />
    );
  }

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
        {showSearch ? <SelectionSearch value={query} onChange={setQuery} /> : null}
        <Paper variant="outlined" sx={{ maxHeight: 210, overflow: 'auto', bgcolor: 'background.default' }}>
          {visibleOptions.length ? (
          <List dense disablePadding>
            {visibleOptions.map(({ value, label }) => {
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
                      onClick={() => toggleOption(value)}
                      sx={{
                        flex: 1,
                        minWidth: 0,
                        py: 0.65,
                        px: 1,
                      }}
                    >
                      <ListItemText
                        primary={
                          <Typography
                            noWrap
                            sx={{
                              color: 'text.primary',
                              fontSize: '0.82rem',
                              fontWeight: 500,
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
          ) : (
            <Box sx={{ px: 1, py: 0.75 }}>
              <Typography color="text.secondary" sx={{ fontSize: '0.78rem' }}>No matches.</Typography>
            </Box>
          )}
        </Paper>
      </Stack>
    </Paper>
  );
}
