import { useState } from 'react';
import {
  Box,
  Collapse,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { EntryBlocks } from '../../../shared/content/EntryBlocks.jsx';
import { findWeaponItemByName } from '../../../shared/character/combat/weaponMastery.js';
import { WeaponMasteryBlock } from '../../../shared/character/combat/WeaponMasteryBlock.jsx';
import ExpandableSelectionList from './ExpandableSelectionList.jsx';
import SelectionSearch from './SelectionSearch.jsx';
import { useOptionSearch } from '../../../shared/content/searchText.js';
import {
  isChoicePlaceholderValue,
  parseTypedProficiencyValue,
} from '../../../shared/character/progression/typedProficiencies.js';
import { matchKey } from '../../../shared/content/nameKeys.js';
import { choiceKeyKind } from '../../../shared/character/progression/choiceNormalization.js';
import { heldProficiencyLabels } from '../../../shared/character/proficiency/heldProficiencies.js';
import ChoiceFrame from './ChoiceFrame.jsx';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import { BUILDER_TEXT } from '../layout/builderText.js';

function parseTypedChoiceValue(value) {
  const parsed = parseTypedProficiencyValue(value);
  return { kind: parsed.kind, label: parsed.label, norm: matchKey(parsed.label) };
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

// The proficiency kind a spec offers: its type, else what its key says
// (choiceKeyKind, the same reading the saved choices get).
const SPEC_TYPE_KINDS = { skill_tool_choice: 'mixed', skill_choice: 'skill', language_choice: 'language', tool_choice: 'tool' };
const KEY_KIND_PROFICIENCY = { skill: 'skill', language: 'language', tool: 'tool', weapon: 'weapon', weaponMastery: 'weapon' };

function specProficiencyKind(spec) {
  if (spec?.type === 'expertise') return null;
  return SPEC_TYPE_KINDS[spec?.type] || KEY_KIND_PROFICIENCY[choiceKeyKind(spec?.key)] || null;
}

function addChoiceValueToKindSet(out, value, kind) {
  const parsed = parseTypedChoiceValue(value);
  if (parsed.kind && parsed.kind !== kind) return;
  if (isChoicePlaceholder(parsed.label)) return;
  addProficiencyBlock(out, parsed.label, kind);
}

// What a pick of this kind cannot offer again: every proficiency of the kind the
// character holds (heldProficiencies.js), and for weapons the masteries too.
function collectBlockedForKind({ character, kind }) {
  const blocked = new Set();
  heldProficiencyLabels(character, kind).forEach((label) => addProficiencyBlock(blocked, label, kind));
  if (kind === 'weapon') {
    (character?.normalizedChoices?.weaponMasteries || []).forEach((item) => addChoiceValueToKindSet(blocked, item, 'weapon'));
  }
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
  return collectBlockedForKind({ character, kind: 'skill' });
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
  return choiceKeyKind(spec?.key) === 'weaponMastery';
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
    <ChoiceFrame label={spec.label} count={selected.length} max={max}>
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
                <Stack direction="row" sx={{ alignItems: 'stretch', minWidth: 0 }}>
                  <ListItemButton
                    selected={active}
                    disabled={full || duplicate}
                    onClick={() => toggleOption(value)}
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      py: 0.75,
                      px: 1,
                    }}
                  >
                    <ListItemText
                      primary={
                        <Typography
                          noWrap
                          sx={BUILDER_TEXT.itemName}
                        >
                          {label}
                        </Typography>
                      }
                    />
                    {active ? <Check size={ICON_SIZES.md} color="currentColor" /> : null}
                  </ListItemButton>
                  {desc ? (
                    <IconButton
                      size="small"
                      aria-label={isOpen ? 'Collapse description' : 'Expand description'}
                      onClick={() => toggleExpanded(value)}
                      sx={{ borderRadius: 0, color: 'text.secondary' }}
                    >
                      {isOpen ? <ChevronUp size={ICON_SIZES.md} /> : <ChevronDown size={ICON_SIZES.md} />}
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
            <Typography sx={BUILDER_TEXT.hint}>No matches.</Typography>
          </Box>
        )}
      </Paper>
    </ChoiceFrame>
  );
}
