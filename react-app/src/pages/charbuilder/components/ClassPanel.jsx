import { Box, Button, Chip, IconButton, List, ListItemButton, ListItemText, Paper, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import BuilderPanel from './BuilderPanel.jsx';
import { SearchField } from './SearchList.jsx';
import { ExpandableCard } from '../../../shared/character/ExpandableCard.jsx';
import { describeMulticlassProficiencies } from '../../../shared/character/multiclassProficiencies.js';
import { getPrimaryClassLevel } from '../logic/calculations.js';
import { checkMulticlassPrerequisite, getMulticlassProficienciesGained } from '../logic/multiclassRules.js';
import { classIcon } from '../../../shared/character/classIcon.js';

// Renders the multiclass proficiency summary (data shaped by
// describeMulticlassProficiencies). Pure view: a "grants nothing" note when the
// live class JSON carries no proficiency data, else a labelled list.
function MulticlassProfDetails({ className, profs }) {
  const rows = describeMulticlassProficiencies(className, profs);
  if (!rows.length) {
    return (
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        This class grants no multiclass proficiencies.
      </Typography>
    );
  }
  return (
    <Stack spacing={0.4}>
      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
        Multiclass proficiencies gained
      </Typography>
      {rows.map(({ label, values }) => (
        <Typography key={label} variant="caption" sx={{ color: 'text.secondary' }}>
          <Box component="span" sx={{ fontWeight: 700 }}>{label}:</Box> {values.join(', ')}
        </Typography>
      ))}
    </Stack>
  );
}

function ClassRow({ cls, selected, onSelect, prereqMet = true, prereqReason = '', details = null }) {
  const Icon = classIcon(cls.name);
  const hitDie = cls.hitDie || `d${cls.hd?.faces || '?'}`;
  const saves = (cls.proficiency || []).map((save) => save.toUpperCase()).join(', ');
  return (
    <ExpandableCard
      details={details}
      containerSx={{ borderBottom: 1, borderColor: 'divider' }}
      detailsSx={{ px: 2, pt: 0.25, pb: 1.25, bgcolor: 'background.paper' }}
      summary={({ open, toggle, disabled: caretDisabled }) => (
        <Stack direction="row" alignItems="stretch" sx={{ minWidth: 0 }}>
          <ListItemButton
            selected={selected}
            disabled={!prereqMet}
            onClick={onSelect}
            sx={{ alignItems: 'flex-start', gap: 0.55, opacity: prereqMet ? 1 : 0.45, flexDirection: 'column', flex: 1, minWidth: 0 }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, width: '100%' }}>
              <Box sx={{ pt: 0.35 }}>
                <Icon size={15} />
              </Box>
              <ListItemText
                primary={<Typography fontWeight={500} sx={{ fontSize: '0.76rem' }}>{cls.name}</Typography>}
                secondary={(
                  <Stack direction="row" spacing={0.45} flexWrap="wrap" useFlexGap sx={{ mt: 0.35 }}>
                    <Chip size="small" label={`Hit Die ${hitDie}`} />
                    {cls.primary ? <Chip size="small" label={`Primary ${cls.primary}`} /> : null}
                    {saves ? <Chip size="small" label={`Saves ${saves}`} /> : null}
                  </Stack>
                )}
                secondaryTypographyProps={{ component: 'div' }}
              />
              <Chip size="small" label={cls.source} />
            </Box>
            {prereqReason && (
              <Typography variant="caption" sx={{ color: 'warning.main', ml: 3, mb: 0.5 }}>
                {prereqReason}
              </Typography>
            )}
          </ListItemButton>
          {!caretDisabled ? (
            <IconButton
              size="small"
              aria-label={open ? `Collapse ${cls.name}` : `Expand ${cls.name}`}
              onClick={toggle}
              sx={{ borderRadius: 0, px: 1, color: 'text.secondary', alignSelf: 'stretch' }}
            >
              {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </IconButton>
          ) : null}
        </Stack>
      )}
    />
  );
}

function checkMcPrereq(character, className) {
  const { met, reason } = checkMulticlassPrerequisite(character, className);
  return { met, reason };
}

export default function ClassPanel({ state, character, dispatch }) {
  const classes = state.data.classes;
  const search = state.search.classes || '';
  const query = search.trim().toLowerCase();
  const visibleClasses = classes.filter((cls) => (
    cls.name.toLowerCase().includes(query)
    || String(cls.source || '').toLowerCase().includes(query)
  ));
  const activeExtra = character.activeClassTab > 0 ? character.extraClasses[character.activeClassTab - 1] : null;
  const isExtraTab = !!activeExtra;
  const takenNames = new Set([character.className, ...character.extraClasses.map((extra) => extra.name)]);
  const PanelIcon = classIcon(activeExtra?.name || character.className);
  const primaryLevel = getPrimaryClassLevel(character);
  const canAddMulticlass = Number(character.level || 1) < 20
    && !character.extraClasses.some((extra) => !extra?.name);
  return (
    <BuilderPanel
      title="Class"
      icon={PanelIcon}
      note={activeExtra ? 'Selecting multiclass class' : 'Selecting primary class'}
      action={
        <Stack direction="row" spacing={0.55} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
          {activeExtra ? (
            <Button size="small" color="error" startIcon={<Trash2 size={16} />} onClick={() => dispatch({ type: 'multiclass/remove', index: character.activeClassTab - 1 })}>
              Remove
            </Button>
          ) : null}
          <Button
            size="small"
            startIcon={<Plus size={16} />}
            disabled={!canAddMulticlass}
            onClick={() => dispatch({ type: 'multiclass/add' })}
          >
            Multiclass
          </Button>
        </Stack>
      }
    >
      <Stack spacing={0.85}>
        <ToggleButtonGroup value={character.activeClassTab} exclusive size="small" onChange={(_, tab) => tab != null && dispatch({ type: 'class-tab/set', tab })}>
          <ToggleButton value={0}>{character.className || 'Primary'} Lv {primaryLevel}</ToggleButton>
          {character.extraClasses.map((extraClass, index) => (
            <ToggleButton key={`${extraClass.name}-${index}`} value={index + 1}>
              {extraClass.name || `Class ${index + 2}`} Lv {extraClass.level || 1}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <SearchField
          value={search}
          placeholder="Search classes"
          onChange={(value) => dispatch({ type: 'search/set', scope: 'classes', value })}
        />
        <Paper variant="outlined" sx={{ maxHeight: 390, overflow: 'auto' }}>
          <List dense disablePadding>
            {visibleClasses.map((cls) => {
              const selected = activeExtra
                ? activeExtra.name === cls.name && activeExtra.source === cls.source
                : character.className === cls.name && character.classSource === cls.source;
              const hasLevelRoom = Boolean(activeExtra?.name) || Number(character.level || 1) < 20;
              const { met: prereqMet, reason: prereqReason } = isExtraTab && !selected
                ? !hasLevelRoom
                  ? { met: false, reason: 'Maximum total level reached' }
                  : !takenNames.has(cls.name)
                    ? checkMcPrereq(character, cls.name)
                    : { met: false, reason: 'Class already taken' }
                : { met: true, reason: '' };
              const profGained = isExtraTab ? getMulticlassProficienciesGained(cls.name, cls) : null;
              const details = isExtraTab ? <MulticlassProfDetails className={cls.name} profs={profGained} /> : null;
              return (
                <ClassRow
                  key={`${cls.name}-${cls.source}`}
                  cls={cls}
                  selected={selected}
                  prereqMet={prereqMet}
                  prereqReason={prereqReason}
                  details={details}
                  onSelect={() => dispatch(activeExtra
                    ? { type: 'extra-class/select', index: character.activeClassTab - 1, className: cls.name, source: cls.source, classObject: cls }
                    : { type: 'class/select', className: cls.name, source: cls.source, classObject: cls })}
                />
              );
            })}
            {!visibleClasses.length ? (
              <Typography color="text.secondary" sx={{ px: 1, py: 1.25 }}>
                No classes found.
              </Typography>
            ) : null}
          </List>
        </Paper>
      </Stack>
    </BuilderPanel>
  );
}
