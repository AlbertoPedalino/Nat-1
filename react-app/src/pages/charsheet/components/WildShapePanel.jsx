import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Link, Stack, Typography } from '@mui/material';
import { PawPrint, RotateCcw, ExternalLink } from 'lucide-react';
import { loadBeasts } from '../../charbuilder/logic/dataLoaders.js';
import { useSheetActions } from '../context/SheetActionsContext.jsx';
import { findBeast, parseBeastRef, beast5eToolsUrl, parseBeastActions } from '../../../shared/character/beasts.js';
import { SKILLS, getMod } from '../logic/calculations.js';
import {
  getActiveWildShape,
  enterWildShapePatch,
  exitWildShapePatch,
} from '../../../shared/character/wildShapeForm.js';

// Sheet panel for the Wild Shape action. Lists the player's known beast forms
// (chosen in the builder), and transforms into / reverts from one. Transform
// resolves the beast snapshot, writes it to C.wildShape, swaps in the beast HP
// pool and Temporary HP — every stat/AC/HP override flows from that one field.

function druidLevel(C) {
  if (String(C?.className || '').toLowerCase() === 'druid') return Number(C?.classLevel || C?.level || 1);
  const extra = (C?.extraClasses || []).find((ec) => String(ec?.name || '').toLowerCase() === 'druid');
  return Number(extra?.level || 0);
}

function knownFormRefs(C) {
  const choices = C?.choices || {};
  for (const [k, v] of Object.entries(choices)) {
    if (k.replace(/^mc\d+_/, '') === 'druid_wild_shape_forms') {
      return Array.isArray(v) ? v : (v ? [v] : []);
    }
  }
  return [];
}

const ABILITY_ORDER = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export default function WildShapePanel({ action, character, sheet, resources, onResChange }) {
  const { onUpdateCharacter, onUpdateSheet } = useSheetActions();
  const [beastsDb, setBeastsDb] = useState([]);
  const resKey = action?.resKey;
  const usesLeft = resKey ? Number(resources?.[resKey] ?? 0) : Infinity;

  useEffect(() => {
    let alive = true;
    loadBeasts().then((db) => { if (alive) setBeastsDb(db || []); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const lv = druidLevel(character);
  const active = getActiveWildShape(character);
  const refs = useMemo(() => knownFormRefs(character), [character]);
  const forms = useMemo(() => refs
    .map((ref) => ({ ref, beast: findBeast(beastsDb, ref), parsed: parseBeastRef(ref) }))
    .filter((f) => f.parsed), [refs, beastsDb]);

  const transform = (beast) => {
    if (!beast || !onUpdateCharacter) return;
    // Wild Shape costs one use unless you're already shaped (switching forms is
    // re-casting Wild Shape, so it also spends a use). Block when none are left.
    if (resKey && typeof onResChange === 'function') {
      if (usesLeft <= 0) return;
      onResChange(resKey, -1);
    }
    onUpdateCharacter((prev) => ({ ...prev, ...enterWildShapePatch(prev, beast, druidLevel(prev)) }));
    // The HP block reads Temp HP from sheet state, which isn't re-derived from the
    // character patch — mirror the Druid-level grant so it shows immediately.
    const granted = Math.max(0, druidLevel(character));
    onUpdateSheet?.({ tempHP: Math.max(Number(sheet?.tempHP || 0), granted) });
  };
  const revert = () => {
    if (!onUpdateCharacter) return;
    // Temp HP persists after reverting, so only the form is ended here.
    onUpdateCharacter((prev) => ({ ...prev, ...exitWildShapePatch() }));
  };

  if (active) {
    const b = active.beast;
    return (
      <Box onClick={(e) => e.stopPropagation()} sx={panelSx}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mb: 0.5 }}>
          <PawPrint size={14} color="#edd48a" />
          <Typography sx={headerSx} component="span">Transformed —</Typography>
          <BeastNameLink name={b.name} source={b.source} sx={headerSx} />
        </Box>
        <BeastStatBlock b={b} lv={lv} />
        <Typography sx={{ ...subSx, fontStyle: 'italic', mt: 0.6 }}>
          Your own HP, INT/WIS/CHA, features and proficiencies are kept; saves &amp; skills use the higher of your bonus or the form's.
        </Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={<RotateCcw size={13} />}
          onClick={revert}
          sx={{ mt: 0.8, fontSize: '0.7rem', borderColor: 'rgba(202,165,80,0.5)', color: '#edd48a' }}
        >
          Revert to normal form
        </Button>
      </Box>
    );
  }

  return (
    <Box onClick={(e) => e.stopPropagation()} sx={panelSx}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mb: 0.5 }}>
        <PawPrint size={14} color="#edd48a" />
        <Typography sx={headerSx}>Known Beast Forms</Typography>
      </Box>
      {!forms.length ? (
        <Typography sx={{ ...subSx, fontStyle: 'italic' }}>
          No forms chosen yet — pick beasts in the character builder (Class Choices → Wild Shape).
        </Typography>
      ) : (
        <Stack spacing={0.5}>
          {forms.map(({ ref, beast, parsed }) => (
            <Box key={ref} sx={rowSx}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <BeastNameLink name={parsed.name} source={beast?.source || parsed.source} sx={{ fontSize: '0.8rem' }} />
                {beast ? (
                  <Typography noWrap sx={subSx}>{`CR ${beast.cr} · ${beast.size} · AC ${beast.ac ?? '—'} · HP ${beast.hp.average}`}</Typography>
                ) : (
                  <Typography noWrap sx={{ ...subSx, color: '#c98a8a' }}>Beast data unavailable</Typography>
                )}
              </Box>
              <Button
                size="small"
                variant="outlined"
                disabled={!beast || usesLeft <= 0}
                onClick={() => transform(beast)}
                sx={{ fontSize: '0.68rem', flexShrink: 0, borderColor: 'rgba(202,165,80,0.5)', color: '#edd48a' }}
              >
                Transform
              </Button>
            </Box>
          ))}
        </Stack>
      )}
      {lv >= 2 ? (
        <Typography sx={{ ...subSx, fontStyle: 'italic', mt: 0.6, color: usesLeft <= 0 ? '#c98a8a' : 'text.secondary' }}>
          {usesLeft <= 0
            ? 'No Wild Shape uses left — finish a Short or Long Rest.'
            : `Transform spends one Wild Shape use (${usesLeft} left).`}
        </Typography>
      ) : null}
    </Box>
  );
}

// Beast name rendered as a link to its 5e.tools bestiary page (opens in a new
// tab). Falls back to plain text if the URL can't be built. stopPropagation keeps
// the click from toggling the surrounding action card.
function BeastNameLink({ name, source, sx }) {
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

const fmtBonus = (n) => `${n >= 0 ? '+' : ''}${n}`;
const fmtMod = (score) => fmtBonus(getMod(Number(score) || 10));

// letters-only beast skill key ("animalhandling") → display name ("Animal Handling").
const SKILL_LABEL = Object.fromEntries(
  SKILLS.map((s) => [s.n.toLowerCase().replace(/[^a-z]/g, ''), s.n]),
);

// Compact 5e stat block for the active Wild Shape form, rendered from the
// normalized beast snapshot. Mirrors a Monster Manual block: meta line, defenses,
// ability grid, proficiencies/senses, then Traits and Actions prose.
function BeastStatBlock({ b, lv }) {
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
      <Typography sx={{ ...metaSx, mb: 0.4 }}>{[b.size, 'Beast', `CR ${b.cr}`].filter(Boolean).join(' · ')}</Typography>
      <StatLine label="AC" value={b.ac ?? '—'} />
      <StatLine label="Form HP" value={`${b.hp.average}${b.hp.formula ? ` (${b.hp.formula})` : ''}`} />
      {lv > 0 ? <StatLine label="Temp HP" value={fmtBonus(lv)} accent /> : null}
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

const panelSx = {
  mt: 0.8,
  p: 1,
  bgcolor: 'rgba(237,212,138,0.04)',
  border: 1,
  borderColor: 'divider',
  borderRadius: 1,
};

const headerSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.66rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  color: '#edd48a',
};

const subSx = { fontSize: '0.62rem', color: 'text.secondary' };

const rowSx = {
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
