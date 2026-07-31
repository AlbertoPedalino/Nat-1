import { useCallback, useState } from 'react';
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
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { Plus, X } from 'lucide-react';
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
import EncounterDiceToast, { buildEncounterDiceToast } from './EncounterDiceToast.jsx';
import InlineText from './InlineText.jsx';
import MonsterToken from './MonsterToken.jsx';
import PlayerSheetPanel from './PlayerSheetPanel.jsx';

const ABILITIES = [
  ['str', 'STR'],
  ['dex', 'DEX'],
  ['con', 'CON'],
  ['int', 'INT'],
  ['wis', 'WIS'],
  ['cha', 'CHA'],
];

export default function StatBlockDialog() {
  const { state, dispatch } = useEncounterBuilder();
  const monster = state.selectedStatblock?.monster;
  if (state.view === 'combat' || !monster) return null;

  return (
    <Dialog open onClose={() => dispatch({ type: 'closeStatblock' })} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pr: 7, position: 'relative' }}>
        <StatBlockHeader monster={monster} onClose={() => dispatch({ type: 'closeStatblock' })} />
      </DialogTitle>
      <DialogContent dividers>
        <StatBlockBody monster={monster} allowAdd />
      </DialogContent>
    </Dialog>
  );
}

export function StatBlockPanel() {
  const { state, dispatch } = useEncounterBuilder();
  const selection = state.selectedStatblock;
  const monster = selection?.monster;
  const isPlayerSelection = selection && !monster && selection.combatantId != null;

  if (!selection) {
    return (
      <Paper sx={statPanelSx}>
        <Stack spacing={1} sx={{ p: 2, minHeight: 220, alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <Typography variant="h2">Statblock</Typography>
          <Typography color="text.secondary">Click a monster or player combatant to inspect it here.</Typography>
        </Stack>
      </Paper>
    );
  }

  if (isPlayerSelection) {
    return (
      <Paper sx={statPanelSx}>
        <PlayerSheetPanel selection={selection} onClose={() => dispatch({ type: 'closeStatblock' })} />
      </Paper>
    );
  }

  if (!monster) {
    return (
      <Paper sx={statPanelSx}>
        <Stack spacing={1} sx={{ p: 2, minHeight: 220, alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <Typography variant="h2">Statblock</Typography>
          <Typography color="text.secondary">Click a monster or player combatant to inspect it here.</Typography>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper sx={statPanelSx}>
      <Box sx={statPanelHeaderSx}>
        <StatBlockHeader monster={monster} onClose={() => dispatch({ type: 'closeStatblock' })} />
      </Box>
      <Divider />
      <Box sx={statPanelBodySx}>
        <StatBlockBody monster={monster} allowAdd={false} />
      </Box>
    </Paper>
  );
}

function StatBlockHeader({ monster, onClose }) {
  const url = monster5eUrl(monster);
  return (
    <>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0, pr: onClose ? 4 : 0 }}>
        <MonsterToken monster={monster} size={58} fallbackText={monster.name?.[0]} />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h2" component="div" noWrap>
            {url ? <Link href={url} target="_blank" rel="noopener" color="inherit" underline="hover">{monster.name}</Link> : monster.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {[getSizeLabel(monster), getType(monster.type)].filter(Boolean).join(' ')}
            {getTypeTags(monster.type)}
            {formatAlignment(monster.alignment) ? `, ${formatAlignment(monster.alignment)}` : ''}
          </Typography>
          <Chip size="small" label={monster.source} color="primary" sx={{ mt: 0.75 }} />
        </Box>
      </Stack>
      {onClose ? (
        <IconButton onClick={onClose} sx={{ position: 'absolute', top: 8, right: 8 }} aria-label="Close statblock">
          <X size={18} />
        </IconButton>
      ) : null}
    </>
  );
}

function StatBlockBody({ monster, allowAdd = false }) {
  const { state, dispatch, monsterDb, roll } = useEncounterBuilder();
  const [diceToast, setDiceToast] = useState(null);
  const legendaryGroup = getLegendaryGroup(monster, monsterDb.legendaryGroups);
  const cr = getCR(monster.cr);
  const hpFormula = monster.hp?.formula;
  const spellcasting = groupSpellcasting(monster.spellcasting);

  const handleRoll = useCallback((notation, type) => {
    const result = roll(notation, type);
    const toast = buildEncounterDiceToast(result);
    if (toast) setDiceToast(toast);
  }, [roll]);

  return (
    <>
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
                <Stack spacing={0} sx={{ alignItems: 'center' }}>
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
            <SectionHeading>Legendary Actions</SectionHeading>
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
        {allowAdd && state.selectedStatblock?.combatantId == null ? (
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
      {diceToast ? <EncounterDiceToast toast={diceToast} onClose={() => setDiceToast(null)} /> : null}
    </>
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
        <SectionHeading>{title}</SectionHeading>
        <Typography component="div" variant="body2">
          <EntryRenderer entries={entries} onRoll={onRoll} />
        </Typography>
      </Stack>
    );
  }
  return (
    <Stack spacing={1}>
      <SectionHeading>{title}</SectionHeading>
      <ActionList entries={entries} onRoll={onRoll} />
      {extra.map((entry, index) => <SpellcastingBlock key={index} entry={entry} onRoll={onRoll} />)}
    </Stack>
  );
}

function SectionHeading({ children }) {
  return (
    <Typography
      variant="h2"
      sx={{
        color: 'primary.main',
        borderBottom: '2px solid',
        borderColor: 'primary.main',
        pb: 0.5,
        mb: 0.25,
      }}
    >
      {children}
    </Typography>
  );
}

function EntryName({ name, onRoll }) {
  if (!name) return null;
  return (
    <Box component="span" sx={{ color: 'secondary.main', fontWeight: 700 }}>
      <InlineText value={`${name}.`} onRoll={onRoll} />{' '}
    </Box>
  );
}

function ActionList({ entries, onRoll }) {
  return (
    <>
      {(entries || []).map((entry, index) => (
        <Typography component="div" variant="body2" key={index} sx={{ mb: 1.25 }}>
          <EntryName name={entry.name} onRoll={onRoll} />
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
      <EntryName name={entry.name} onRoll={onRoll} />
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

const statPanelSx = {
  bgcolor: 'background.paper',
  overflow: 'hidden',
  alignSelf: 'start',
  position: { lg: 'sticky' },
  top: { lg: 82 },
  maxHeight: { lg: 'calc(100vh - 104px)' },
};

const statPanelHeaderSx = {
  p: 2,
  position: 'relative',
};

const statPanelBodySx = {
  p: 2,
  overflow: 'auto',
  maxHeight: { xs: 520, lg: 'calc(100vh - 218px)' },
};
