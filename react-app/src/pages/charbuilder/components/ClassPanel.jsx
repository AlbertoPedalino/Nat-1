import { Box, Button, Chip, List, ListItemButton, ListItemText, Paper, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { AlertCircle, Axe, BookOpen, Compass, Cross, Dumbbell, Eye, Feather, Flame, Hammer, Music, Plus, Shield, Sparkles, Sword, Trash2, Wand2 } from 'lucide-react';
import BuilderPanel from './BuilderPanel.jsx';
import { SearchField } from './SearchList.jsx';
import { getPrimaryClassLevel } from '../logic/calculations.js';
import { checkMulticlassPrerequisite, checkSpellcastingMulticlass, getMulticlassProficienciesGained } from '../logic/multiclassRules.js';

const CLASS_ICONS = {
  Artificer: Hammer,
  Barbarian: Axe,
  Bard: Music,
  Cleric: Cross,
  Druid: Feather,
  Fighter: Sword,
  Monk: Dumbbell,
  Paladin: Shield,
  Ranger: Compass,
  Rogue: Eye,
  Sorcerer: Sparkles,
  Warlock: Flame,
  Wizard: BookOpen,
};

function classIcon(className) {
  return CLASS_ICONS[className] || Wand2;
}

function ClassRow({ cls, selected, onSelect, prereqMet = true, prereqReason = '', warningMsg = '' }) {
  const Icon = classIcon(cls.name);
  const hitDie = cls.hitDie || `d${cls.hd?.faces || '?'}`;
  const saves = (cls.proficiency || []).map((save) => save.toUpperCase()).join(', ');
  return (
    <ListItemButton
      selected={selected}
      divider
      disabled={!prereqMet}
      onClick={onSelect}
      sx={{ alignItems: 'flex-start', gap: 0.55, opacity: prereqMet ? 1 : 0.45, flexDirection: 'column' }}
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
              {!prereqMet ? <Chip size="small" color="warning" label="Prereq NO" /> : null}
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
      {warningMsg && (
        <Stack direction="row" spacing={0.5} sx={{ ml: 3, alignItems: 'flex-start', color: 'info.main', fontSize: '0.75rem' }}>
          <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
          <Typography variant="caption" sx={{ color: 'info.main' }}>{warningMsg}</Typography>
        </Stack>
      )}
    </ListItemButton>
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
          <Button size="small" startIcon={<Plus size={16} />} onClick={() => dispatch({ type: 'multiclass/add' })}>
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
              const { met: prereqMet, reason: prereqReason } = isExtraTab && !selected
                ? !takenNames.has(cls.name) ? checkMcPrereq(character, cls.name) : { met: false, reason: 'Class already taken' }
                : { met: true, reason: '' };
              const spellWarning = isExtraTab && !selected && prereqMet
                ? checkSpellcastingMulticlass(character, cls.name)
                : { warning: false, message: '' };
              const profGained = isExtraTab && !selected ? getMulticlassProficienciesGained(cls.name) : null;
              const profText = profGained && (profGained.armor?.length || profGained.weapons?.length)
                ? `Gains: ${[...((profGained.armor || []).slice(0, 2).join(', ') ? [profGained.armor.slice(0, 2).join(', ')] : []), ...((profGained.weapons || []).slice(0, 2).join(', ') ? [profGained.weapons.slice(0, 2).join(', ')] : [])].join(' + ')}`
                : '';
              return (
                <ClassRow
                  key={`${cls.name}-${cls.source}`}
                  cls={cls}
                  selected={selected}
                  prereqMet={prereqMet}
                  prereqReason={prereqReason}
                  warningMsg={spellWarning.message || (profText ? `MC Profs: ${profText}` : '')}
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
