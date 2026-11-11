import { useMemo, useState } from 'react';
import { List, ListItemButton, Paper, Typography } from '@mui/material';
import { spellMatchesAnyClass } from '../../../shared/character/spells/spellClassMatch.js';
import { SpellMiniTags, SpellReferenceBody, SpellRowLabel, SpellSelectButton } from '../../../shared/character/spells/SpellReference.jsx';
import { ExpandableCard } from '../../../shared/ui/ExpandableCard.jsx';
import SelectionSearch from '../choices/SelectionSearch.jsx';
import { filterOptions, SEARCH_MIN_OPTIONS } from '../../../shared/content/searchText.js';
import { stripSource } from '../../../shared/content/nameKeys.js';
import { baseChoiceKey } from '../../../shared/character/progression/choiceUtils.js';
import ChoiceFrame from '../choices/ChoiceFrame.jsx';
import { BUILDER_TEXT } from '../layout/builderText.js';

function _knownCantripNames(character) {
  const names = new Set();
  (character.selectedCantrips || []).forEach(function (name) { names.add(name); });
  (character.extraClasses || []).forEach(function (ec) {
    (ec.selectedCantrips || []).forEach(function (name) { names.add(name); });
  });
  return names;
}

export default function SpellChoiceList({ spec, state, dispatch }) {
  const filter = spec.spellFilter || {};
  const levels = useMemo(() => {
    if (Array.isArray(filter.spellLevels)) return filter.spellLevels.map(Number);
    if (filter.spellLevel != null) return [Number(filter.spellLevel)];
    return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  }, [filter.spellLevels, filter.spellLevel]);
  const classes = filter.classes?.length ? filter.classes : (spec.classes || []);
  const allSpells = filter.allSpells === true || !classes.length;
  const selected = Array.isArray(state.character.choices[spec.key]) ? state.character.choices[spec.key] : [];
  const max = spec.count || 1;
  // Modifier-only choices (Agonizing/Repelling Blast, Eldritch Spear) attach an effect
  // to an already-known cantrip — render a compact row: name + tags only, no 5e.tools
  // link, meta, description, or source chip. Everything else (feat spell/cantrip
  // pickers like Magic Initiate / Blessed Warrior) uses the same expandable row as
  // the main spell panel: name + Add button, tap to expand the live 5etools body.
  const compact = !!filter.modifierOnly;
  const [query, setQuery] = useState('');
  const basePool = useMemo(() => {
    var spells = state.data.spells
      .filter((spell) => levels.includes(Number(spell.level)))
      .filter((spell) => !filter.schools?.length || filter.schools.includes(spell.school) || filter.schools.includes(spell.schoolFull))
      .filter((spell) => allSpells || spellMatchesAnyClass(spell, classes, state.data.classSpellIndex));

    if (filter.knownCantripOnly) {
      var known = _knownCantripNames(state.character);
      spells = spells.filter(function (spell) { return known.has(spell.name); });
    }

    if (Array.isArray(filter.cantripAllowList) && filter.cantripAllowList.length) {
      var allow = new Set(filter.cantripAllowList.map(function (n) { return String(n).toLowerCase(); }));
      spells = spells.filter(function (spell) { return allow.has(String(spell.name).toLowerCase()); });
    }

    if (filter.modifierOnly) {
      var keyBase = baseChoiceKey(spec.key).replace(/_\d+$/, '');
      var alreadyChosen = new Set();
      Object.entries(state.character.choices || {}).forEach(function (entry) {
        var choiceKey = baseChoiceKey(entry[0]);
        if (choiceKey === spec.key) return;
        var choiceBase = choiceKey.replace(/_\d+$/, '');
        if (choiceBase !== keyBase) return;
        var val = stripSource(entry[1]);
        if (val) alreadyChosen.add(val);
      });
      if (alreadyChosen.size) {
        spells = spells.filter(function (spell) { return !alreadyChosen.has(spell.name); });
      }
    }

    return spells;
  }, [state.data.spells, state.data.classSpellIndex, levels, classes, filter.schools, allSpells, filter.knownCantripOnly, filter.modifierOnly, filter.cantripAllowList, state.character, spec.key]);

  const showSearch = basePool.length >= SEARCH_MIN_OPTIONS;
  const pool = useMemo(
    () => filterOptions(basePool, showSearch ? query : '', (spell) => spell.name).slice(0, 200),
    [basePool, query, showSearch],
  );

  return (
    <ChoiceFrame label={spec.label} count={selected.length} max={max}>
      {showSearch ? (
        <SelectionSearch value={query} onChange={setQuery} placeholder="Search spells" />
      ) : null}
      <Paper variant="outlined" sx={{ maxHeight: 260, overflow: 'auto' }}>
        <List dense disablePadding>
          {pool.map((spell) => {
            const active = selected.includes(spell.name);
            const full = !active && selected.length >= max;
            const toggle = () => dispatch({ type: 'choice/toggle-item', key: spec.key, value: spell.name, max });
            if (compact) {
              return (
                <ListItemButton
                  key={`${spec.key}-${spell.name}-${spell.source}`}
                  divider
                  selected={active}
                  disabled={full}
                  onClick={toggle}
                >
                  <SpellRowLabel spell={spell} selected={active} showIcon={false} />
                  <SpellMiniTags spell={spell} sx={{ ml: 1 }} />
                </ListItemButton>
              );
            }
            return (
              <ExpandableCard
                key={`${spec.key}-${spell.name}-${spell.source}`}
                containerSx={{ borderBottom: 1, borderColor: 'divider' }}
                bodySx={{ px: 2, pt: 0.25, pb: 1.25 }}
                body={<SpellReferenceBody spell={spell} />}
                header={({ open, toggle: toggleOpen }) => (
                  <ListItemButton selected={active} aria-expanded={open} sx={{ alignItems: 'center', gap: 0.5 }} onClick={toggleOpen}>
                    <SpellRowLabel spell={spell} selected={active} />
                    <SpellMiniTags spell={spell} sx={{ mx: 1 }} />
                    <SpellSelectButton selected={active} disabled={full} onToggle={toggle} />
                  </ListItemButton>
                )}
              />
            );
          })}
        </List>
      </Paper>
      {!pool.length ? <Typography sx={BUILDER_TEXT.hint}>No spells found for this filter.</Typography> : null}
    </ChoiceFrame>
  );
}
