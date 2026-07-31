import { useEffect } from 'react';
import { Button, Chip, Paper, Stack, Typography } from '@mui/material';
import { Lock } from 'lucide-react';
import ChoiceBlock from './ChoiceBlock.jsx';
import ExpandableSelectionList from './ExpandableSelectionList.jsx';
import SpellChoiceList from './SpellChoiceList.jsx';
import { EntryAccordion, partitionNamedEntries } from '../../../shared/character/EntryAccordion.jsx';
import { EntryBlocks } from '../../../shared/character/EntryBlocks.jsx';
import { findSpellListEntryIndexByClass } from '../../../shared/character/featSpellLists.js';
import { featChoiceSpecs } from '../logic/choiceSpecs.js';
import { buildFeatPrerequisiteContext, meetsFeatPrerequisites } from '../logic/featPrerequisites.js';

function featMatchesCategory(feat, wanted, fixedOptions = []) {
  const norm = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (fixedOptions.some((name) => norm(name) === norm(feat?.name))) return true;
  if (!wanted?.length) return fixedOptions.length === 0;
  const cats = (feat.categories?.length ? feat.categories : [feat.category]).filter(Boolean).map((value) => String(value));
  const exact = wanted.some((cat) => String(cat || '').startsWith('FS'));
  return wanted.some((cat) => cats.some((featCat) => exact ? featCat === cat : featCat === cat || featCat.startsWith(cat)));
}

function featChoiceName(value) {
  if (value && typeof value === 'object') return featChoiceName(value.name || value.label || value.value);
  return String(value || '').split('|')[0].split(';')[0].trim();
}

function featChoiceKey(value) {
  return featChoiceName(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findFeat(feats, name) {
  if (!name) return null;
  const target = featChoiceKey(name);
  return feats.find((entry) => featChoiceKey(entry.name) === target)
    || feats.find((entry) => featChoiceKey(entry.name).startsWith(target));
}

function renderGrantSpec({ grant, character, state, dispatch }) {
  if (grant.type === 'spell_choice' || grant.type === 'spell_grant') {
    return <SpellChoiceList key={grant.key} spec={grant} state={state} dispatch={dispatch} />;
  }
  return (
    <ChoiceBlock
      key={grant.key}
      spec={grant}
      choices={character.choices}
      dispatch={dispatch}
      character={character}
      items={state.data.items}
    />
  );
}

function grantLabel(entry) {
  for (const mode of ['known', 'innate', 'prepared', 'expanded']) {
    const section = entry?.[mode];
    if (!section) continue;
    for (const items of Object.values(section)) {
      const arr = Array.isArray(items) ? items : items?._;
      if (!Array.isArray(arr)) continue;
      for (const item of arr) {
        if (typeof item === 'string') return item.split('|')[0];
        if (item?.choose) {
          const cls = String(item.choose).split('|').find((p) => p.startsWith('class='));
          if (cls) return cls.slice(6).split(';')[0];
        }
      }
    }
  }
  return entry?.name || '?';
}

// Spell-list picker for feats that grant a choice of spell list (e.g. Magic
// Initiate / Fey Touched). Renders nothing unless the feat offers more than one
// list. Shared by the fixed and category feat slots. When `locked` (the granting
// source fixed the list, e.g. Acolyte → Magic Initiate (Cleric)) it renders the
// chosen list as a read-only chip instead of switchable buttons.
function FeatSpellListSelector({ feat, additional, entryIdx, slotKey, dispatch, locked = false }) {
  if (!Array.isArray(additional) || additional.length <= 1) return null;
  const entryKey = `${slotKey}_entry`;
  const listLabel = feat?.choiceUi?.listLabel || `${feat?.name || 'Feat'} Spell List`;
  return (
    <Stack spacing={0.6}>
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
        {listLabel}
      </Typography>
      {locked ? (
        <Chip
          size="small"
          color="primary"
          variant="outlined"
          icon={<Lock size={12} />}
          label={grantLabel(additional[entryIdx] || additional[0])}
          sx={{ alignSelf: 'flex-start' }}
        />
      ) : (
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
          {additional.map((entry, idx) => (
            <Button
              key={`${slotKey}-entry-${idx}`}
              size="small"
              variant={idx === entryIdx ? 'contained' : 'outlined'}
              onClick={() => dispatch({ type: 'choice/set-entry', key: entryKey, value: idx, clearPrefix: `${slotKey}_spell_` })}
            >
              {grantLabel(entry)}
            </Button>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

// Feat descriptions render directly inside the expanded option. Only named
// sub-entries become accordion rows, avoiding a redundant nested "Description"
// toggle for feats and Fighting Styles.
function FeatDescriptionRows({ feat }) {
  const { introEntries, namedEntries } = partitionNamedEntries(feat?.entries);
  if (!introEntries.length && !namedEntries.length) {
    return <Typography color="text.secondary">No description available.</Typography>;
  }
  return (
    <Stack spacing={0.5} sx={{ minWidth: 0 }}>
      {introEntries.length ? (
        <EntryBlocks entries={introEntries} emptyText="No description available." />
      ) : null}
      {namedEntries.map((row, idx) => (
        <EntryAccordion key={`${row.name}-${idx}`} title={row.name} entries={row.entries} />
      ))}
    </Stack>
  );
}

// Separate, always-visible panel with everything selectable for a feat (spell
// list + granted choices). Renders nothing when the feat has no choices. Shared
// by both feat slots so selection always lives in its own panel.
//
// `lockedListClass` (only the background origin-feat slot passes one) fixes the
// spell list to that class — the list selector renders read-only and the entry
// index is derived from the hint rather than the player's pick.
function FeatChoicesPanel({ feat, slotKey, character, state, dispatch, lockedListClass = null }) {
  const additional = Array.isArray(feat?.additionalSpells) ? feat.additionalSpells : [];
  const entryKey = `${slotKey}_entry`;
  const multiList = additional.length > 1;
  const lockIdx = multiList ? findSpellListEntryIndexByClass(additional, lockedListClass) : -1;
  const locked = lockIdx >= 0;
  const rawEntryIdx = character.choices[entryKey];
  const entryIdx = locked
    ? lockIdx
    : (multiList && rawEntryIdx != null ? Number(rawEntryIdx) : null);
  const grants = feat ? featChoiceSpecs(feat, { slotKey, entryIdx }) : [];
  if (!multiList && grants.length === 0) return null;
  return (
    <Paper variant="outlined" sx={{ p: 1.5, minWidth: 0 }}>
      <Stack spacing={1} sx={{ minWidth: 0 }}>
        <Typography variant="h2">{feat.name} Choices</Typography>
        <FeatSpellListSelector feat={feat} additional={additional} entryIdx={entryIdx} slotKey={slotKey} dispatch={dispatch} locked={locked} />
        {grants.map((grant) => renderGrantSpec({ grant, character, state, dispatch }))}
      </Stack>
    </Paper>
  );
}

// Fixed feat (e.g. a background's origin feat): description rows with any
// selectable choices in a separate panel below.
export function FeatFixedSlot({ spec, feats, character, state, dispatch }) {
  const feat = findFeat(feats, spec.fixed);
  return (
    <Stack spacing={1.5} sx={{ minWidth: 0 }}>
      <Paper variant="outlined" sx={{ p: 1.5, minWidth: 0 }}>
        <Stack spacing={1} sx={{ minWidth: 0 }}>
          <Typography variant="h2">{feat ? feat.name : spec.fixed}</Typography>
          <FeatDescriptionRows feat={feat} />
        </Stack>
      </Paper>
      <FeatChoicesPanel feat={feat} slotKey={spec.key} character={character} state={state} dispatch={dispatch} lockedListClass={spec.classHint} />
    </Stack>
  );
}

// Category feat slot: pick a feat from a category, then its description (accordion
// rows) and selectable choices render exactly like the fixed slot, so both feat
// surfaces look the same.
export function FeatCategorySlot({ spec, feats, character, state, dispatch }) {
  const taken = new Set(Object.entries(character.choices || {})
    .filter(([key]) => key !== spec.key)
    .map(([, value]) => Array.isArray(value) ? value : [value])
    .flat()
    .map(featChoiceKey)
    .filter(Boolean));
  const isFs = (spec.categories || []).some((cat) => String(cat).startsWith('FS'));
  const disallowDuplicates = isFs || !!spec.disallowDuplicates;
  const prerequisiteContext = buildFeatPrerequisiteContext({
    character,
    feats,
    items: state.data.items,
    slotKey: spec.key,
    slotCategories: spec.categories,
  });
  const isAvailable = (feat) => (
    meetsFeatPrerequisites(feat, prerequisiteContext)
    && featMatchesCategory(feat, spec.categories, spec.fixedOptions)
    && (!disallowDuplicates || !taken.has(featChoiceKey(feat.name)))
  );
  const pool = feats
    .filter(isAvailable)
    .slice(0, 80);
  const selected = character.choices[spec.key] || null;
  const selectedKey = featChoiceKey(selected);
  const selectedFeatCandidate = findFeat(feats, selected);
  const canValidateSelection = !state?.loading?.feats && state?.dataAdapted;
  const selectedEligible = !selected
    || !canValidateSelection
    || !selectedFeatCandidate
    || isAvailable(selectedFeatCandidate);
  const selectedFeat = selectedEligible ? selectedFeatCandidate : null;
  useEffect(() => {
    if (!selected || selectedEligible) return;
    dispatch({
      type: 'choice/set',
      key: spec.key,
      value: null,
      clearPrefix: `${spec.key}_`,
    });
  }, [dispatch, selected, selectedEligible, spec.key]);
  const options = pool.map((feat) => ({
    key: `${spec.key}-${feat.name}-${feat.source}`,
    value: feat.name,
    label: feat.name,
    selected: selectedKey === featChoiceKey(feat.name),
    details: <FeatDescriptionRows feat={feat} />,
  }));

  return (
    <Stack spacing={1.5} sx={{ minWidth: 0 }}>
      <ExpandableSelectionList
        title={spec.label}
        options={options}
        selectedCount={selected ? 1 : 0}
        max={spec.count || 1}
        emptyText="No feats match."
        onSelect={(option) => dispatch({
          type: 'choice/set',
          key: spec.key,
          value: option.selected ? null : option.value,
          clearPrefix: `${spec.key}_`,
        })}
      />
      <FeatChoicesPanel feat={selectedFeat} slotKey={spec.key} character={character} state={state} dispatch={dispatch} />
    </Stack>
  );
}
