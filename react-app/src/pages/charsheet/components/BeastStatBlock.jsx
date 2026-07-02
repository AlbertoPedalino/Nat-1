import { Box, Link, Typography } from '@mui/material';
import { ExternalLink } from 'lucide-react';
import { SKILLS, getMod } from '../logic/calculations.js';
import { beast5eToolsUrl, parseBeastActions, parseBeastActionsRich } from '../../../shared/character/beasts.js';
import { formatRollTitle } from '../../../shared/character/dice.js';

// Shared presentational layer for a normalized beast snapshot, used by both the
// Wild Shape and Wild Companion sheet panels. Renders a compact Monster-Manual
// style stat block plus the name-as-link helper and the panel chrome styles, so
// the two features can never disagree on how a beast reads.

const ABILITY_ORDER = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

const fmtBonus = (n) => `${n >= 0 ? '+' : ''}${n}`;
const fmtMod = (score) => fmtBonus(getMod(Number(score) || 10));

// letters-only beast skill key ("animalhandling") → display name ("Animal Handling").
const SKILL_LABEL = Object.fromEntries(
  SKILLS.map((s) => [s.n.toLowerCase().replace(/[^a-z]/g, ''), s.n]),
);

// Beast name rendered as a link to its 5e.tools bestiary page (opens in a new
// tab). Falls back to plain text if the URL can't be built. stopPropagation keeps
// the click from toggling the surrounding action card.
export function BeastNameLink({ name, source, sx }) {
  const url = beast5eToolsUrl(name, source);
  if (!url) return <Typography noWrap sx={{ color: 'text.primary', ...sx }}>{name}</Typography>;
  return (
    <Link
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      underline="hover"
      title="Open stat block on 5e.tools"
      onClick={(e) => e.stopPropagation()}
      sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, minWidth: 0, color: '#edd48a', cursor: 'pointer', ...sx }}
    >
      <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</Box>
      <ExternalLink size={11} style={{ flexShrink: 0, opacity: 0.7 }} />
    </Link>
  );
}

// Compact 5e stat block from a normalized beast snapshot. Mirrors a Monster
// Manual block: meta line, defenses, ability grid, proficiencies/senses, then
// Traits and Actions prose. `typeLabel` overrides the creature type shown in the
// meta line (Wild Companion familiars are Fey, not Beast). `hpLabel` names the HP
// line, and a positive `tempHP` adds the Wild Shape Temporary-HP grant row.
//
// When `onRoll(bonus, label)` is supplied, the ability scores, saves, and skills
// become clickable d20-check rollers (encounter-builder style); `onRollFormula`
// makes the HP dice formula rollable. Both optional — omit them for a plain,
// read-only stat block. Rolls are the creature's own, so callers should route
// them through pure dice + a toast (not the character's rollD20, whose exhaustion
// penalty must not bleed onto a separate summoned creature).
export function BeastStatBlock({ b, typeLabel = 'Beast', hpLabel = 'HP', tempHP = 0, onRoll, onRollFormula }) {
  const rollable = typeof onRoll === 'function';
  const speed = Object.entries(b.speed || {})
    .filter(([k]) => k !== 'hover')
    .map(([k, v]) => `${k} ${v} ft.`).join(', ');
  const saveItems = ABILITY_ORDER.filter((k) => b.saves?.[k] != null).map((k) => ({
    key: k,
    text: `${k.toUpperCase()} ${fmtBonus(b.saves[k])}`,
    bonus: b.saves[k],
    rollLabel: formatRollTitle(b.name, `${k.toUpperCase()} Save`),
  }));
  const skillItems = Object.entries(b.skills || {}).map(([k, v]) => ({
    key: k,
    text: `${SKILL_LABEL[k] || k} ${fmtBonus(v)}`,
    bonus: v,
    rollLabel: formatRollTitle(b.name, SKILL_LABEL[k] || k),
  }));
  const senses = [...(b.senses || []), b.passivePerception ? `passive Perception ${b.passivePerception}` : null]
    .filter(Boolean).join(', ');
  // Rollable: prose becomes inline roll pills ({@hit}/{@damage}); else flat text.
  const traits = rollable ? parseBeastActionsRich(b.traits) : parseBeastActions(b.traits);
  const actions = rollable ? parseBeastActionsRich(b.actions) : parseBeastActions(b.actions);

  return (
    <Box sx={statBlockSx}>
      <Typography sx={{ ...metaSx, mb: 0.4 }}>{[b.size, typeLabel, `CR ${b.cr}`].filter(Boolean).join(' · ')}</Typography>
      <StatLine label="AC" value={b.ac ?? '—'} />
      {onRollFormula && b.hp?.formula ? (
        <Typography sx={subSx}>
          <Box component="span" sx={{ color: '#edd48a', fontWeight: 700 }}>{hpLabel}:</Box>{' '}
          {b.hp.average} (
          <RollChip onClick={() => onRollFormula(b.hp.formula, formatRollTitle(b.name, hpLabel))}>{b.hp.formula}</RollChip>)
        </Typography>
      ) : (
        <StatLine label={hpLabel} value={`${b.hp.average}${b.hp.formula ? ` (${b.hp.formula})` : ''}`} />
      )}
      {tempHP > 0 ? <StatLine label="Temp HP" value={fmtBonus(tempHP)} accent /> : null}
      {speed ? <StatLine label="Speed" value={speed} /> : null}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2px 8px', my: 0.5, py: 0.5, borderTop: 1, borderBottom: 1, borderColor: 'divider' }}>
        {ABILITY_ORDER.map((k) => {
          const scoreText = `${b.abilities[k]} (${fmtMod(b.abilities[k])})`;
          return (
            <Box key={k} sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
              <Typography component="span" sx={{ fontSize: '0.56rem', fontWeight: 700, letterSpacing: '0.06em', color: '#edd48a', width: 22, flexShrink: 0 }}>{k.toUpperCase()}</Typography>
              {rollable ? (
                <RollChip
                  sx={{ fontSize: '0.64rem' }}
                  onClick={() => onRoll(getMod(Number(b.abilities[k]) || 10), formatRollTitle(b.name, `${k.toUpperCase()} Check`))}
                >
                  {scoreText}
                </RollChip>
              ) : (
                <Typography component="span" sx={{ fontSize: '0.64rem', color: 'text.primary' }}>{scoreText}</Typography>
              )}
            </Box>
          );
        })}
      </Box>
      {saveItems.length ? (
        rollable
          ? <RollableStatLine label="Saving Throws" items={saveItems} onRoll={onRoll} />
          : <StatLine label="Saving Throws" value={saveItems.map((s) => s.text).join(', ')} />
      ) : null}
      {skillItems.length ? (
        rollable
          ? <RollableStatLine label="Skills" items={skillItems} onRoll={onRoll} />
          : <StatLine label="Skills" value={skillItems.map((s) => s.text).join(', ')} />
      ) : null}
      {senses ? <StatLine label="Senses" value={senses} /> : null}
      {traits.length ? <StatSection title="Traits" items={traits} onRoll={onRoll} onRollFormula={onRollFormula} beastName={b.name} /> : null}
      {actions.length ? <StatSection title="Actions" items={actions} onRoll={onRoll} onRollFormula={onRollFormula} beastName={b.name} /> : null}
    </Box>
  );
}

// Small clickable pill that fires a roll. stopPropagation keeps the click from
// toggling the surrounding action card.
function RollChip({ onClick, children, sx }) {
  return (
    <Box
      component="button"
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      sx={{ ...rollChipSx, ...sx }}
    >
      {children}
    </Box>
  );
}

// A StatLine whose comma-separated values are each an individual roll pill.
function RollableStatLine({ label, items, onRoll }) {
  return (
    <Typography sx={subSx}>
      <Box component="span" sx={{ color: '#edd48a', fontWeight: 700 }}>{label}:</Box>{' '}
      {items.map((it, i) => (
        <Box component="span" key={it.key}>
          {i ? ', ' : null}
          <RollChip onClick={() => onRoll(it.bonus, it.rollLabel)}>{it.text}</RollChip>
        </Box>
      ))}
    </Typography>
  );
}

function StatLine({ label, value, accent }) {
  return (
    <Typography sx={subSx}>
      <Box component="span" sx={{ color: '#edd48a', fontWeight: 700 }}>{label}:</Box>{' '}
      <Box component="span" sx={accent ? { color: '#edd48a', fontWeight: 700 } : undefined}>{value}</Box>
    </Typography>
  );
}

function StatSection({ title, items, onRoll, onRollFormula, beastName }) {
  return (
    <Box sx={{ mt: 0.5 }}>
      <Typography sx={{ ...headerSx, fontSize: '0.58rem', mb: 0.2 }}>{title}</Typography>
      {items.map((it, i) => (
        <Typography key={`${it.name}-${i}`} sx={{ ...subSx, mb: 0.2 }}>
          <Box component="span" sx={{ fontStyle: 'italic', fontWeight: 700, color: 'text.primary' }}>{it.name}.</Box>{' '}
          {it.tokens
            ? it.tokens.map((tok, ti) => renderEntryToken(tok, ti, onRoll, onRollFormula, beastName))
            : it.text}
        </Typography>
      ))}
    </Box>
  );
}

// One prose token: plain text, or a roll pill for {@hit}/{@damage}. Falls back to
// plain text if the matching roll handler wasn't provided.
function renderEntryToken(tok, key, onRoll, onRollFormula, beastName) {
  if (tok.type !== 'roll') return <Box component="span" key={key}>{tok.text}</Box>;
  const label = formatRollTitle(beastName, tok.rollType);
  if (tok.kind === 'formula') {
    if (typeof onRollFormula !== 'function') return <Box component="span" key={key}>{tok.text}</Box>;
    return <RollChip key={key} onClick={() => onRollFormula(tok.formula, label)}>{tok.text}</RollChip>;
  }
  if (typeof onRoll !== 'function') return <Box component="span" key={key}>{tok.text}</Box>;
  return <RollChip key={key} onClick={() => onRoll(tok.bonus, label)}>{tok.text}</RollChip>;
}

const statBlockSx = {
  p: 0.8,
  borderRadius: 1,
  bgcolor: 'rgba(35,32,26,0.6)',
  border: 1,
  borderColor: 'divider',
};

const metaSx = { fontSize: '0.6rem', fontStyle: 'italic', color: 'text.secondary', letterSpacing: '0.03em' };

const rollChipSx = {
  appearance: 'none',
  display: 'inline-flex',
  alignItems: 'baseline',
  border: '1px solid rgba(202,165,80,0.45)',
  bgcolor: 'rgba(202,165,80,0.12)',
  color: '#edd48a',
  borderRadius: '4px',
  px: '0.28em',
  py: 0,
  font: 'inherit',
  lineHeight: 1.35,
  cursor: 'pointer',
  '&:hover': { bgcolor: 'rgba(202,165,80,0.24)' },
};

export const panelSx = {
  mt: 0.8,
  p: 1,
  bgcolor: 'rgba(237,212,138,0.04)',
  border: 1,
  borderColor: 'divider',
  borderRadius: 1,
};

export const headerSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.66rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  color: '#edd48a',
};

export const subSx = { fontSize: '0.62rem', color: 'text.secondary' };

export const rowSx = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  px: '8px',
  py: '5px',
  border: 1,
  borderColor: 'divider',
  borderRadius: 1,
  bgcolor: 'rgba(35,32,26,1)',
};
