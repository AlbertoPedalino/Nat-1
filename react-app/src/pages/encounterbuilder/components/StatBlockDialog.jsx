import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import { Plus, X } from 'lucide-react';
import { useToast } from '../../../shared/ToastProvider.jsx';
import { getLegendaryGroup } from '../logic/bestiary.js';
import {
  abilityModString,
  crXP,
  formatAlignment,
  formatDamageList,
  formatMod,
  formatNumber,
  formatSpeed,
  getAC,
  getACDesc,
  getCR,
  getHP,
  getSizeLabel,
  getType,
  getTypeTags,
  monster5eUrl,
} from '../logic/monsterUtils.js';
import { useEncounterBuilder } from '../state/EncounterBuilderContext.jsx';
import EntryRenderer from './EntryRenderer.jsx';
import InlineText from './InlineText.jsx';
import MonsterToken from './MonsterToken.jsx';

const ABILITIES = [
  ['str', 'STR'],
  ['dex', 'DEX'],
  ['con', 'CON'],
  ['int', 'INT'],
  ['wis', 'WIS'],
  ['cha', 'CHA'],
];

export default function StatBlockDialog() {
  const { state, dispatch, monsterDb, roll } = useEncounterBuilder();
  const { notify } = useToast();
  const monster = state.selectedStatblock?.monster;
  const open = Boolean(monster);
  const legendaryGroup = getLegendaryGroup(monster, monsterDb.legendaryGroups);

  const handleRoll = (notation, type) => {
    const result = roll(notation, type);
    if (result) notify('info', `${type}: ${result.result} (${result.mathStr})`, { autoHideDuration: 3500 });
  };

  if (!monster) return null;

  const url = monster5eUrl(monster);
  const cr = getCR(monster.cr);
  const hpFormula = monster.hp?.formula;
  const spellcasting = groupSpellcasting(monster.spellcasting);

  return (
    <Dialog open={open} onClose={() => dispatch({ type: 'closeStatblock' })} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pr: 7 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <MonsterToken monster={monster} size={58} fallbackText={monster.name?.[0]} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h2" component="div">
              {url ? <Link href={url} target="_blank" rel="noopener" color="inherit" underline="hover">{monster.name}</Link> : monster.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {[getSizeLabel(monster), getType(monster)].filter(Boolean).join(' ')}
              {getTypeTags(monster)}
              {formatAlignment(monster.alignment) ? `, ${formatAlignment(monster.alignment)}` : ''}
            </Typography>
            <Chip size="small" label={monster.source} color="primary" sx={{ mt: 0.75 }} />
          </Box>
        </Stack>
        <IconButton onClick={() => dispatch({ type: 'closeStatblock' })} sx={{ position: 'absolute', top: 8, right: 8 }}>
          <X size={18} />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <Prop label="Armor Class">{getAC(monster.ac)}{getACDesc(monster.ac)}</Prop>
          <Prop label="Hit Points">
            {getHP(monster.hp)} {hpFormula ? (
              <>
                (
                <RollText notation={hpFormula} type="HP" onRoll={handleRoll}>{hpFormula}</RollText>
                )
              </>
            ) : null}
          </Prop>
          <Prop label="Speed">{formatSpeed(monster.speed)}</Prop>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(6,minmax(0,1fr))', gap: 1 }}>
            {ABILITIES.map(([key, label]) => {
              const mod = abilityModString(monster[key]);
              return (
                <Button key={key} variant="outlined" color="secondary" onClick={() => handleRoll(mod, `${label} Check`)} sx={{ minWidth: 0, p: 1 }}>
                  <Stack spacing={0} alignItems="center">
                    <Typography variant="caption">{label}</Typography>
                    <Typography fontWeight={700}>{monster[key] ?? 10} ({mod})</Typography>
                  </Stack>
                </Button>
              );
            })}
          </Box>
          <OptionalProp label="Saving Throws" value={monster.save} render={(save) => renderRollMap(save, 'Save', handleRoll)} />
          <OptionalProp label="Skills" value={monster.skill} render={(skills) => renderRollMap(skills, '', handleRoll)} />
          <OptionalProp label="Damage Vulnerabilities" value={formatDamageList(monster.vulnerable, 'vulnerable')} />
          <OptionalProp label="Damage Resistances" value={formatDamageList(monster.resist, 'resist')} />
          <OptionalProp label="Damage Immunities" value={formatDamageList(monster.immune, 'immune')} />
          <OptionalProp label="Condition Immunities" value={formatDamageList(monster.conditionImmune, 'conditionImmune')} />
          <OptionalProp label="Senses" value={[...(monster.senses || []), monster.passive != null ? `passive Perception ${monster.passive}` : ''].filter(Boolean).join(', ')} />
          <Prop label="Languages">{Array.isArray(monster.languages) ? monster.languages.join(', ') : monster.languages || '—'}</Prop>
          <Prop label="Challenge">{cr} ({formatNumber(crXP(cr))} XP)</Prop>
          <Divider />
          <Section title="Traits" entries={monster.trait} extra={spellcasting.trait} onRoll={handleRoll} />
          <Section title="Actions" entries={monster.action} extra={spellcasting.action} onRoll={handleRoll} />
          <Section title="Bonus Actions" entries={monster.bonus} extra={spellcasting.bonus} onRoll={handleRoll} />
          <Section title="Reactions" entries={monster.reaction} extra={spellcasting.reaction} onRoll={handleRoll} />
          {(monster.legendary?.length || spellcasting.legendary.length) ? (
            <Stack spacing={1}>
              <Typography variant="h2">Legendary Actions</Typography>
              <Typography variant="body2" color="text.secondary">
                {monster.legendaryHeader
                  ? <EntryRenderer entries={monster.legendaryHeader} onRoll={handleRoll} />
                  : defaultLegendaryIntro(monster)}
              </Typography>
              <ActionList entries={monster.legendary} onRoll={handleRoll} />
              {spellcasting.legendary.map((entry, index) => <SpellcastingBlock key={index} entry={entry} onRoll={handleRoll} />)}
            </Stack>
          ) : null}
          <Section title="Mythic Actions" entries={monster.mythic} onRoll={handleRoll} />
          {legendaryGroup?.lairActions?.length ? <Section title="Lair Actions" entries={legendaryGroup.lairActions} onRoll={handleRoll} force /> : null}
          {legendaryGroup?.regionalEffects?.length ? <Section title="Regional Effects" entries={legendaryGroup.regionalEffects} onRoll={handleRoll} force /> : null}
          {legendaryGroup?.mythicEncounter?.length ? <Section title={`${monster.name} as a Mythic Encounter`} entries={legendaryGroup.mythicEncounter} onRoll={handleRoll} force /> : null}
          {state.selectedStatblock?.combatantId == null ? (
            <Button
              variant="contained"
              startIcon={<Plus size={16} />}
              onClick={() => {
                dispatch({ type: 'addMonster', monster });
                dispatch({ type: 'closeStatblock' });
              }}
            >
              Add to Encounter
            </Button>
          ) : null}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

function Prop({ label, children }) {
  return (
    <Typography component="div" variant="body2">
      <Box component="span" sx={{ color: 'primary.main', fontWeight: 700 }}>{label}</Box>{' '}
      {children}
    </Typography>
  );
}

function OptionalProp({ label, value, render }) {
  if (!value || (typeof value === 'object' && !Object.keys(value).length)) return null;
  return <Prop label={label}>{render ? render(value) : value}</Prop>;
}

function RollText({ notation, type, onRoll, children }) {
  return (
    <Box component="button" type="button" onClick={() => onRoll(notation, type)} sx={rollableSx}>
      {children}
    </Box>
  );
}

function renderRollMap(value, suffix, onRoll) {
  return Object.entries(value).map(([key, mod], index) => {
    const label = key.charAt(0).toUpperCase() + key.slice(1);
    const type = suffix ? `${label} ${suffix}` : label;
    return (
      <Box component="span" key={key}>
        {index ? ', ' : null}
        <RollText notation={mod} type={type} onRoll={onRoll}>{label} {formatMod(mod)}</RollText>
      </Box>
    );
  });
}

function Section({ title, entries, extra = [], onRoll, force = false }) {
  const hasEntries = Array.isArray(entries) && entries.length;
  if (!force && !hasEntries && !extra.length) return null;
  if (force) {
    return (
      <Stack spacing={1}>
        <Typography variant="h2">{title}</Typography>
        <Typography component="div" variant="body2">
          <EntryRenderer entries={entries} onRoll={onRoll} />
        </Typography>
      </Stack>
    );
  }
  return (
    <Stack spacing={1}>
      <Typography variant="h2">{title}</Typography>
      <ActionList entries={entries} onRoll={onRoll} />
      {extra.map((entry, index) => <SpellcastingBlock key={index} entry={entry} onRoll={onRoll} />)}
    </Stack>
  );
}

function ActionList({ entries, onRoll }) {
  return (
    <>
      {(entries || []).map((entry, index) => (
        <Typography component="div" variant="body2" key={index} sx={{ mb: 0.75 }}>
          {entry.name ? <Box component="b"><Box component="i"><InlineText value={`${entry.name}. `} onRoll={onRoll} /></Box></Box> : null}
          <EntryRenderer entries={entry.entries} onRoll={onRoll} />
        </Typography>
      ))}
    </>
  );
}

function groupSpellcasting(spellcasting = []) {
  const grouped = { trait: [], action: [], bonus: [], reaction: [], legendary: [] };
  (spellcasting || []).forEach((entry) => {
    const display = entry.displayAs || 'trait';
    (grouped[display] || grouped.trait).push(entry);
  });
  return grouped;
}

function SpellcastingBlock({ entry, onRoll }) {
  const hidden = entry.hidden || [];
  const rows = [];
  if (entry.will && !hidden.includes('will')) rows.push(['At will', entry.will]);
  if (entry.daily && !hidden.includes('daily')) {
    Object.entries(entry.daily).forEach(([key, value]) => {
      const label = key.includes('e') ? key.replace('e', '/day each') : `${key}/day`;
      rows.push([label, Array.isArray(value) ? value : value.spells || []]);
    });
  }
  if (entry.spells && !hidden.includes('spells')) {
    Object.entries(entry.spells).forEach(([key, value]) => {
      const label = key === '0' ? 'Cantrips' : `Level ${key}${value.slots ? ` (${value.slots} slot)` : ''}`;
      rows.push([label, value.spells || []]);
    });
  }
  return (
    <Typography component="div" variant="body2">
      <Box component="b"><Box component="i"><InlineText value={`${entry.name}. `} onRoll={onRoll} /></Box></Box>
      {entry.headerEntries ? <EntryRenderer entries={entry.headerEntries} onRoll={onRoll} /> : null}
      {rows.length ? (
        <Box sx={{ ml: 2, mt: 0.5 }}>
          {rows.map(([label, spells], index) => (
            <Box key={index}>
              <Box component="i">{label}:</Box>{' '}
              {spells.map((spell, spellIndex) => (
                <Box component="span" key={`${spell}-${spellIndex}`}>
                  <EntryRenderer entries={spell} onRoll={onRoll} />{spellIndex < spells.length - 1 ? ', ' : ''}
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      ) : null}
      {entry.footerEntries ? <Box sx={{ mt: 0.5 }}><EntryRenderer entries={entry.footerEntries} onRoll={onRoll} /></Box> : null}
    </Typography>
  );
}

function defaultLegendaryIntro(monster) {
  const uses = monster.legendaryActions || 3;
  const lairUses = monster.legendaryActionsLair || uses;
  const possessive = monster.isNamedCreature ? 'their' : 'its';
  return (
    <>
      <Box component="i">Legendary Action Uses: {uses}{lairUses !== uses ? ` (${lairUses} in Lair)` : ''}.</Box>{' '}
      Immediately after another creature&apos;s turn, {monster.name} can expend a use to take one of the following actions.
      {' '}{monster.name} regains all expended uses at the start of each of {possessive} turns.
    </>
  );
}

const rollableSx = {
  appearance: 'none',
  border: '1px solid rgba(112,183,166,0.45)',
  bgcolor: 'rgba(112,183,166,0.12)',
  color: '#96d8c6',
  borderRadius: '4px',
  px: '0.25rem',
  py: 0,
  font: 'inherit',
  cursor: 'pointer',
  '&:hover': {
    bgcolor: 'rgba(112,183,166,0.22)',
  },
};
