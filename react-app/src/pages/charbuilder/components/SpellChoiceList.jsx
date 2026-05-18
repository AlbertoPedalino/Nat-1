import { useMemo } from 'react';
import { Chip, List, ListItemButton, ListItemText, Paper, Stack, Typography } from '@mui/material';
import { spellMatchesAnyClass } from '../spells/spells.js';
import { isConcentrationSpell, isRitualSpell } from '../../../shared/spellTags.js';
import { SpellNameIcon } from '../../../shared/character/FiveEToolsLink.jsx';
import { entriesToPlainText } from '../../../shared/character/spellEntries.js';

const SPELL_LEVEL_LABELS = ['Cantrip', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];

function _knownCantripNames(character) {
  const names = new Set();
  (character.selectedCantrips || []).forEach(function (name) { names.add(name); });
  (character.extraClasses || []).forEach(function (ec) {
    (ec.selectedCantrips || []).forEach(function (name) { names.add(name); });
  });
  return names;
}

function _spellDealsDamage(spell) {
  if (spell.damageInflict && Array.isArray(spell.damageInflict) && spell.damageInflict.length) return true;
  if (spell.damage) return true;
  return false;
}

function spellSnippet(spell) {
  return entriesToPlainText(spell.descriptionEntries || spell.entries, { maxLength: 220 });
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
  const pool = useMemo(() => {
    var spells = state.data.spells
      .filter((spell) => levels.includes(Number(spell.level)))
      .filter((spell) => !filter.schools?.length || filter.schools.includes(spell.school) || filter.schools.includes(spell.schoolFull))
      .filter((spell) => allSpells || spellMatchesAnyClass(spell, classes, state.data.classSpellIndex));

    if (filter.knownCantripOnly) {
      var known = _knownCantripNames(state.character);
      spells = spells.filter(function (spell) { return known.has(spell.name); });
    }

    if (filter.modifierOnly) {
      var keyBase = spec.key.replace(/^mc\d+_/, '').replace(/_\d+$/, '');
      var alreadyChosen = new Set();
      Object.entries(state.character.choices || {}).forEach(function (entry) {
        var choiceKey = entry[0].replace(/^mc\d+_/, '');
        if (choiceKey === spec.key) return;
        var choiceBase = choiceKey.replace(/_\d+$/, '');
        if (choiceBase !== keyBase) return;
        var val = String(entry[1] || '').split('|')[0].trim();
        if (val) alreadyChosen.add(val);
      });
      if (alreadyChosen.size) {
        spells = spells.filter(function (spell) { return !alreadyChosen.has(spell.name); });
      }
    }

    return spells.slice(0, 200);
  }, [state.data.spells, state.data.classSpellIndex, levels, classes, filter.schools, allSpells, filter.knownCantripOnly, filter.modifierOnly, state.character, spec.key]);

  return (
    <Paper variant="outlined" sx={{ p: 1.5, minWidth: 0 }}>
      <Stack spacing={1} sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="h2" sx={{ flex: 1, minWidth: 0 }}>{spec.label}</Typography>
          <Chip size="small" label={`${selected.length}/${max}`} color={selected.length >= max ? 'primary' : 'default'} />
        </Stack>
        <Paper variant="outlined" sx={{ maxHeight: 260, overflow: 'auto' }}>
          <List dense disablePadding>
            {pool.map((spell) => {
              const active = selected.includes(spell.name);
              const full = !active && selected.length >= max;
              const meta = [
                SPELL_LEVEL_LABELS[spell.level] || `Lv ${spell.level}`,
                spell.schoolFull || spell.school,
                spell.castingTimeLabel || spell.castingTime,
                spell.rangeLabel || spell.rangeText,
              ].filter(Boolean).join(' - ');
              const description = spellSnippet(spell);
              return (
                <ListItemButton
                  key={`${spec.key}-${spell.name}-${spell.source}`}
                  divider
                  selected={active}
                  disabled={full}
                  onClick={() => dispatch({ type: 'choice/toggle-item', key: spec.key, value: spell.name, max })}
                >
                  <SpellNameIcon spell={spell} />
                  <ListItemText
                    primary={(
                      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0 }}>
                        <Typography fontWeight={active ? 700 : 500} noWrap sx={{ minWidth: 0 }}>{spell.name}</Typography>
                        <SpellMiniTags spell={spell} />
                      </Stack>
                    )}
                    secondary={(
                      <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                        <Typography variant="caption" color="text.secondary" noWrap>{meta}</Typography>
                        {description ? (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.25 }}
                          >
                            {description}
                          </Typography>
                        ) : null}
                      </Stack>
                    )}
                    secondaryTypographyProps={{ component: 'div' }}
                  />
                  <Chip size="small" color={active ? 'primary' : 'default'} label={spell.source} />
                </ListItemButton>
              );
            })}
          </List>
        </Paper>
        {!pool.length ? <Typography variant="body2" color="text.secondary">No spells found for this filter.</Typography> : null}
      </Stack>
    </Paper>
  );
}


function SpellMiniTags({ spell }) {
  const tags = [
    isConcentrationSpell(spell) ? { label: 'C', color: '#9d7fb8', bg: 'rgba(157,127,184,0.16)', title: 'Concentration' } : null,
    isRitualSpell(spell) ? { label: 'R', color: '#58b879', bg: 'rgba(63,166,108,0.14)', title: 'Ritual' } : null,
  ].filter(Boolean);

  if (!tags.length) return null;

  return (
    <Stack direction="row" spacing={0.25} alignItems="center" sx={{ flexShrink: 0 }}>
      {tags.map((tag) => (
        <Typography
          key={tag.label}
          title={tag.title}
          component="span"
          sx={{
            border: 1,
            borderColor: tag.color,
            color: tag.color,
            bgcolor: tag.bg,
            borderRadius: '3px',
            px: '5px',
            py: '1px',
            fontFamily: '"Cinzel", Georgia, serif',
            fontSize: '0.55rem',
            fontWeight: 700,
            lineHeight: 1.25,
          }}
        >
          {tag.label}
        </Typography>
      ))}
    </Stack>
  );
}
