import { Box, Link, Typography } from '@mui/material';
import { ExternalLink } from 'lucide-react';
import { SKILLS, getMod } from '../logic/calculations.js';
import { beast5eToolsUrl, parseBeastActions } from '../../../shared/character/beasts.js';

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
export function BeastStatBlock({ b, typeLabel = 'Beast', hpLabel = 'HP', tempHP = 0 }) {
  const speed = Object.entries(b.speed || {})
    .filter(([k]) => k !== 'hover')
    .map(([k, v]) => `${k} ${v} ft.`).join(', ');
  const saves = ABILITY_ORDER.filter((k) => b.saves?.[k] != null)
    .map((k) => `${k.toUpperCase()} ${fmtBonus(b.saves[k])}`).join(', ');
  const skills = Object.entries(b.skills || {})
    .map(([k, v]) => `${SKILL_LABEL[k] || k} ${fmtBonus(v)}`).join(', ');
  const senses = [...(b.senses || []), b.passivePerception ? `passive Perception ${b.passivePerception}` : null]
    .filter(Boolean).join(', ');
  const traits = parseBeastActions(b.traits);
  const actions = parseBeastActions(b.actions);

  return (
    <Box sx={statBlockSx}>
      <Typography sx={{ ...metaSx, mb: 0.4 }}>{[b.size, typeLabel, `CR ${b.cr}`].filter(Boolean).join(' · ')}</Typography>
      <StatLine label="AC" value={b.ac ?? '—'} />
      <StatLine label={hpLabel} value={`${b.hp.average}${b.hp.formula ? ` (${b.hp.formula})` : ''}`} />
      {tempHP > 0 ? <StatLine label="Temp HP" value={fmtBonus(tempHP)} accent /> : null}
      {speed ? <StatLine label="Speed" value={speed} /> : null}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2px 8px', my: 0.5, py: 0.5, borderTop: 1, borderBottom: 1, borderColor: 'divider' }}>
        {ABILITY_ORDER.map((k) => (
          <Box key={k} sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
            <Typography component="span" sx={{ fontSize: '0.56rem', fontWeight: 700, letterSpacing: '0.06em', color: '#edd48a', width: 22, flexShrink: 0 }}>{k.toUpperCase()}</Typography>
            <Typography component="span" sx={{ fontSize: '0.64rem', color: 'text.primary' }}>{b.abilities[k]} ({fmtMod(b.abilities[k])})</Typography>
          </Box>
        ))}
      </Box>
      {saves ? <StatLine label="Saving Throws" value={saves} /> : null}
      {skills ? <StatLine label="Skills" value={skills} /> : null}
      {senses ? <StatLine label="Senses" value={senses} /> : null}
      {traits.length ? <StatSection title="Traits" items={traits} /> : null}
      {actions.length ? <StatSection title="Actions" items={actions} /> : null}
    </Box>
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

function StatSection({ title, items }) {
  return (
    <Box sx={{ mt: 0.5 }}>
      <Typography sx={{ ...headerSx, fontSize: '0.58rem', mb: 0.2 }}>{title}</Typography>
      {items.map((it, i) => (
        <Typography key={`${it.name}-${i}`} sx={{ ...subSx, mb: 0.2 }}>
          <Box component="span" sx={{ fontStyle: 'italic', fontWeight: 700, color: 'text.primary' }}>{it.name}.</Box>{' '}
          {it.text}
        </Typography>
      ))}
    </Box>
  );
}

const statBlockSx = {
  p: 0.8,
  borderRadius: 1,
  bgcolor: 'rgba(35,32,26,0.6)',
  border: 1,
  borderColor: 'divider',
};

const metaSx = { fontSize: '0.6rem', fontStyle: 'italic', color: 'text.secondary', letterSpacing: '0.03em' };

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
