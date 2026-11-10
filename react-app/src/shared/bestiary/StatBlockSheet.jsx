// A monster's stat block as the 2024 Monster Manual prints it: the header
// (name, token, type line) and the sheet below it. The encounter builder,
// the compendium and the battle map all show monsters through these.
import { useCallback } from 'react';
import {
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import { X } from 'lucide-react';
import { getLegendaryGroup } from './bestiary.js';
import { armorClassEntry, formatAlignment, formatDamageList, formatSpeed, getAC, getACDesc, getHP, getSizeLabel, displayType, getTypeTags } from './monsterUtils.js';
import EntryRenderer from './EntryRenderer.jsx';
import InlineText from './InlineText.jsx';
import MonsterToken from './MonsterToken.jsx';
import RollModeArea from '../character/dice/RollModeArea.jsx';
import { advArgFor } from '../character/dice/advantage.js';
import { creatureRollSources } from '../character/combat/rollSources.js';
import { StatRollContext, advTag, d20RollKind } from './statRolls.js';
import RollText from './RollText.jsx';
import { signed, formatNumber } from '../ui/numberFormat.js';
import { abilityModifier } from '../character/progression/abilityModifier.js';
import { capitalize } from '../ui/textCase.js';
import { ABILITIES, ABILITY_ABBREVIATIONS } from '../content/rulesVocabulary.js';
import { crKey, crPB, crXP } from './challengeRating.js';
import { get5eToolsBestiaryUrl } from '../content/fiveEToolsLinks.js';
import { FONT_WEIGHTS } from '../ui/fonts.js';
import { ICON_SIZES } from '../ui/iconSizes.js';

export function StatBlockHeader({ monster, onClose }) {
  const url = get5eToolsBestiaryUrl(monster?.name, monster?.source);
  return (
    <>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0, pr: onClose ? 4 : 0 }}>
        <MonsterToken monster={monster} size={58} fallbackText={monster.name?.[0]} />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h2" component="div" noWrap>
            {url ? <Link href={url} target="_blank" rel="noopener" color="inherit" underline="hover">{monster.name}</Link> : monster.name}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {[getSizeLabel(monster), displayType(monster.type)].filter(Boolean).join(' ')}
            {getTypeTags(monster.type)}
            {formatAlignment(monster.alignment) ? `, ${formatAlignment(monster.alignment)}` : ''}
          </Typography>
          <Chip size="small" label={monster.source} color="primary" sx={{ mt: 0.75 }} />
        </Box>
      </Stack>
      {onClose ? (
        <IconButton onClick={onClose} sx={{ position: 'absolute', top: 8, right: 8 }} aria-label="Close statblock">
          <X size={ICON_SIZES.lg} />
        </IconButton>
      ) : null}
    </>
  );
}

export function StatBlockSheet({ monster, legendaryGroups, conditions = null, onRoll, children = null }) {
  const legendaryGroup = getLegendaryGroup(monster, legendaryGroups);
  // A Wild Shape form (Bear Form) or a summon template states its AC, Hit
  // Points and ability scores as rules ("15 + your Wisdom modifier") and has
  // no Challenge Rating.
  const hasCr = monster.cr != null;
  const cr = crKey(monster.cr);
  const hpFormula = monster.hp?.formula;
  const acEntry = armorClassEntry(monster.ac);
  const acSpecial = acEntry.value == null ? acEntry.special : '';
  const hpSpecial = String(monster.hp?.special || '').trim();
  const abilityRules = [...new Set(ABILITIES
    .map((key) => monster[key])
    .filter((score) => score && typeof score === 'object' && score.special)
    .map((score) => String(score.special).trim()))];
  const spellcasting = groupSpellcasting(monster.spellcasting);

  const sourcesFor = useCallback((type) => {
    const info = d20RollKind(type);
    if (!info) return null;
    if (!conditions || !info.kind) return { adv: false, disadv: false, autoFail: false, situational: [] };
    return creatureRollSources({ conditions }, info.kind, info.ability);
  }, [conditions]);

  // `advantage` present (even undefined, a straight roll) is the right-click
  // menu's choice; absent, the creature's own sources decide.
  const handleRoll = useCallback((notation, type, options = {}) => {
    const sources = sourcesFor(type);
    const advantage = Object.hasOwn(options, 'advantage')
      ? options.advantage
      : (sources ? advArgFor(sources) : undefined);
    const note = sources?.autoFail ? 'Auto-fail: a condition fails STR and DEX saves' : '';
    onRoll?.({ notation, type, advantage, note });
  }, [onRoll, sourcesFor]);

  return (
    <StatRollContext.Provider value={sourcesFor}>
      <Stack spacing={1.5}>
        <Prop label="Armor Class">{acSpecial ? <InlineText value={acSpecial} /> : <>{getAC(monster.ac)}{getACDesc(monster.ac)}</>}</Prop>
        <Prop label={monster.hp?.isTemporary ? 'Temporary Hit Points' : 'Hit Points'}>
          {hpSpecial ? <InlineText value={hpSpecial} /> : getHP(monster.hp)} {hpFormula ? (
            <>
              (
              <RollText notation={hpFormula} type="HP" onRoll={handleRoll}>{hpFormula}</RollText>
              )
            </>
          ) : null}
        </Prop>
        <Prop label="Speed">{formatSpeed(monster.speed)}</Prop>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(6,minmax(0,1fr))', gap: 1 }}>
          {ABILITIES.map((key) => {
            const label = ABILITY_ABBREVIATIONS[key];
            if (typeof monster[key] === 'object' && monster[key]) {
              return (
                <Stack key={key} spacing={0} sx={{ alignItems: 'center', p: 1 }}>
                  <Typography variant="caption">{label}</Typography>
                  <Typography sx={{ fontWeight: FONT_WEIGHTS.bold }}>—</Typography>
                </Stack>
              );
            }
            const mod = signed(abilityModifier(monster[key]));
            const type = `${label} Check`;
            const sources = sourcesFor(type);
            return (
              <RollModeArea
                key={key}
                component={Button}
                variant="outlined"
                color="secondary"
                sources={sources}
                onPick={(advantage) => handleRoll(mod, type, { advantage })}
                onClick={() => handleRoll(mod, type)}
                sx={{ minWidth: 0, p: 1 }}
              >
                <Stack spacing={0} sx={{ alignItems: 'center' }}>
                  <Typography variant="caption">{label}{advTag(advArgFor(sources))}</Typography>
                  <Typography sx={{ fontWeight: FONT_WEIGHTS.bold }}>{monster[key] ?? 10} ({mod})</Typography>
                </Stack>
              </RollModeArea>
            );
          })}
        </Box>
        {abilityRules.map((rule) => (
          <Typography key={rule} variant="body2" sx={{ color: 'text.secondary' }}><InlineText value={rule} /></Typography>
        ))}
        <OptionalProp label="Saving Throws" value={monster.save} render={(save) => renderRollMap(save, 'Save', handleRoll)} />
        <OptionalProp label="Skills" value={monster.skill} render={(skills) => renderRollMap(skills, 'Check', handleRoll)} />
        <OptionalProp label="Damage Vulnerabilities" value={formatDamageList(monster.vulnerable, 'vulnerable')} />
        <OptionalProp label="Damage Resistances" value={formatDamageList(monster.resist, 'resist')} />
        <OptionalProp label="Damage Immunities" value={formatDamageList(monster.immune, 'immune')} />
        <OptionalProp label="Condition Immunities" value={formatDamageList(monster.conditionImmune, 'conditionImmune')} />
        <OptionalProp label="Senses" value={[...(monster.senses || []), monster.passive != null ? `passive Perception ${monster.passive}` : ''].filter(Boolean).join(', ')} />
        <Prop label="Languages">{Array.isArray(monster.languages) ? monster.languages.join(', ') : monster.languages || '—'}</Prop>
        {hasCr ? <Prop label="Challenge">{cr} ({formatNumber(crXP(cr))} XP)</Prop> : null}
        {monster.pbNote || hasCr ? <Prop label="Proficiency Bonus">{monster.pbNote ? <InlineText value={monster.pbNote} /> : signed(crPB(cr))}</Prop> : null}
        <Divider />
        <Section title="Traits" entries={monster.trait} extra={spellcasting.trait} onRoll={handleRoll} />
        <Section title="Actions" entries={monster.action} extra={spellcasting.action} onRoll={handleRoll} />
        <Section title="Bonus Actions" entries={monster.bonus} extra={spellcasting.bonus} onRoll={handleRoll} />
        <Section title="Reactions" entries={monster.reaction} extra={spellcasting.reaction} onRoll={handleRoll} />
        {(monster.legendary?.length || spellcasting.legendary.length) ? (
          <Stack spacing={1}>
            <SectionHeading>Legendary Actions</SectionHeading>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
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
        {children}
      </Stack>
    </StatRollContext.Provider>
  );
}

function Prop({ label, children }) {
  return (
    <Typography component="div" variant="body2">
      <Box component="span" sx={{ color: 'primary.main', fontWeight: FONT_WEIGHTS.bold }}>{label}</Box>{' '}
      {children}
    </Typography>
  );
}

function OptionalProp({ label, value, render }) {
  if (!value || (typeof value === 'object' && !Object.keys(value).length)) return null;
  return <Prop label={label}>{render ? render(value) : value}</Prop>;
}

function renderRollMap(value, suffix, onRoll) {
  return Object.entries(value).map(([key, mod], index) => {
    const label = capitalize(key);
    const type = suffix ? `${label} ${suffix}` : label;
    return (
      <Box component="span" key={key}>
        {index ? ', ' : null}
        <RollText notation={mod} type={type} onRoll={onRoll}>{label} {signed(mod)}</RollText>
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
    <Box component="span" sx={{ color: 'secondary.main', fontWeight: FONT_WEIGHTS.bold }}>
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
