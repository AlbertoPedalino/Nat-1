import { useState } from 'react';
import { Box, Button, Collapse, Link, Typography } from '@mui/material';
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { getMod } from '../../../shared/character/sheet/sheetStats.js';
import { parseBeastActions, parseBeastActionsRich } from '../../../shared/character/forms/beasts.js';
import { formatRollTitle } from '../../../shared/character/dice/dice.js';
import { signed } from '../../../shared/ui/numberFormat.js';
import { UI_COLORS, uiAlpha } from '../../../shared/ui/colors.js';
import { UI_FONTS, FONT_SIZES, LETTER_SPACINGS } from '../../../shared/ui/fonts.js';
import { ABILITIES, SKILL_NAMES } from '../../../shared/content/rulesVocabulary.js';
import { get5eToolsBestiaryUrl } from '../../../shared/content/fiveEToolsLinks.js';
import { detailPanelSx, detailTitleSx } from '../layout/layout.js';

// Shared presentational layer for a normalized beast snapshot, used by both the
// Wild Shape and Wild Companion sheet panels. Renders a compact Monster-Manual
// style stat block plus the name-as-link helper and the panel chrome styles, so
// the two features can never disagree on how a beast reads.

const fmtMod = (score) => signed(getMod(Number(score) || 10));

// letters-only beast skill key ("animalhandling") → display name ("Animal Handling").
const SKILL_LABEL = Object.fromEntries(
  SKILL_NAMES.map((name) => [name.toLowerCase().replace(/[^a-z]/g, ''), name]),
);

// Beast name rendered as a link to its 5e.tools bestiary page (opens in a new
// tab). Falls back to plain text if the URL can't be built. stopPropagation keeps
// the click from toggling the surrounding action card.
export function BeastNameLink({ name, source, sx }) {
  const url = get5eToolsBestiaryUrl(name, source);
  if (!url) return <Typography noWrap sx={{ color: 'text.primary', ...sx }}>{name}</Typography>;
  return (
    <Link
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      underline="hover"
      title="Open stat block on 5e.tools"
      onClick={(e) => e.stopPropagation()}
      sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, minWidth: 0, color: UI_COLORS.accentText, cursor: 'pointer', ...sx }}
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
// penalty must not bleed onto a separate summoned creature). `b.checkBonus` is
// added to every ability check (a Ranger's Primal Bond adds the PB).
export function BeastStatBlock({
  b,
  typeLabel = 'Beast',
  hpLabel = 'HP',
  tempHP = 0,
  showCr = true,
  onRoll,
  onRollFormula,
  bonusActionAccessory,
}) {
  const rollable = typeof onRoll === 'function';
  const speed = Object.entries(b.speed || {})
    .filter(([k]) => k !== 'hover')
    .map(([k, v]) => `${k} ${v} ft.`).join(', ');
  const saveItems = ABILITIES.filter((k) => b.saves?.[k] != null).map((k) => ({
    key: k,
    text: `${k.toUpperCase()} ${signed(b.saves[k])}`,
    bonus: b.saves[k],
    rollLabel: formatRollTitle(b.name, `${k.toUpperCase()} Save`),
  }));
  const skillItems = Object.entries(b.skills || {}).map(([k, v]) => ({
    key: k,
    text: `${SKILL_LABEL[k] || k} ${signed(v)}`,
    bonus: v,
    rollLabel: formatRollTitle(b.name, SKILL_LABEL[k] || k),
  }));
  const senses = [...(b.senses || []), b.passivePerception ? `passive Perception ${b.passivePerception}` : null]
    .filter(Boolean).join(', ');
  // Rollable: prose becomes inline roll pills ({@hit}/{@damage}); else flat text.
  const traits = rollable ? parseBeastActionsRich(b.traits) : parseBeastActions(b.traits);
  const actions = rollable ? parseBeastActionsRich(b.actions) : parseBeastActions(b.actions);
  const bonusActions = rollable ? parseBeastActionsRich(b.bonusActions) : parseBeastActions(b.bonusActions);
  const reactions = rollable ? parseBeastActionsRich(b.reactions) : parseBeastActions(b.reactions);
  const listText = (value) => (Array.isArray(value) ? value.filter(Boolean).join(', ') : String(value || ''));
  const meta = [b.size, typeLabel, showCr && b.cr != null ? `CR ${b.cr}` : null].filter(Boolean).join(' · ');

  return (
    <Box sx={statBlockSx}>
      <Typography sx={{ ...metaSx, mb: 0.4 }}>{meta}</Typography>
      <StatLine label="AC" value={b.ac ?? '—'} />
      {onRollFormula && b.hp?.formula ? (
        <Typography sx={subSx}>
          <Box component="span" sx={{ color: UI_COLORS.accentText, fontWeight: 700 }}>{hpLabel}:</Box>{' '}
          {b.hp.average} (
          <RollChip onClick={() => onRollFormula(b.hp.formula, formatRollTitle(b.name, hpLabel))}>{b.hp.formula}</RollChip>)
        </Typography>
      ) : (
        <StatLine label={hpLabel} value={`${b.hp.average}${b.hp.formula ? ` (${b.hp.formula})` : ''}`} />
      )}
      {tempHP > 0 ? <StatLine label="Temp HP" value={signed(tempHP)} accent /> : null}
      {speed ? <StatLine label="Speed" value={speed} /> : null}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2px 8px', my: 0.5, py: 0.5, borderTop: 1, borderBottom: 1, borderColor: 'divider' }}>
        {ABILITIES.map((k) => {
          const scoreText = `${b.abilities[k]} (${fmtMod(b.abilities[k])})`;
          return (
            <Box key={k} sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
              <Typography component="span" sx={{ fontSize: FONT_SIZES.xxs, fontWeight: 700, letterSpacing: LETTER_SPACINGS.md, color: UI_COLORS.accentText, width: 22, flexShrink: 0 }}>{k.toUpperCase()}</Typography>
              {rollable ? (
                <RollChip
                  sx={{ fontSize: FONT_SIZES.xs }}
                  onClick={() => onRoll(getMod(Number(b.abilities[k]) || 10) + (Number(b.checkBonus) || 0), formatRollTitle(b.name, `${k.toUpperCase()} Check`))}
                >
                  {scoreText}
                </RollChip>
              ) : (
                <Typography component="span" sx={{ fontSize: FONT_SIZES.xs, color: 'text.primary' }}>{scoreText}</Typography>
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
      {listText(b.vulnerable) ? <StatLine label="Vulnerabilities" value={listText(b.vulnerable)} /> : null}
      {listText(b.resist) ? <StatLine label="Resistances" value={listText(b.resist)} /> : null}
      {listText(b.immune) ? <StatLine label="Immunities" value={listText(b.immune)} /> : null}
      {listText(b.conditionImmune) ? <StatLine label="Condition Immunities" value={listText(b.conditionImmune)} /> : null}
      {listText(b.languages) ? <StatLine label="Languages" value={listText(b.languages)} /> : null}
      {b.proficiencyNote ? <StatLine label="Proficiency Bonus" value={b.proficiencyNote} /> : null}
      {traits.length ? <StatSection title="Traits" items={traits} onRoll={onRoll} onRollFormula={onRollFormula} beastName={b.name} /> : null}
      {actions.length ? <StatSection title="Actions" items={actions} onRoll={onRoll} onRollFormula={onRollFormula} beastName={b.name} /> : null}
      {bonusActions.length ? <StatSection title="Bonus Actions" items={bonusActions} onRoll={onRoll} onRollFormula={onRollFormula} beastName={b.name} itemAccessory={bonusActionAccessory} /> : null}
      {reactions.length ? <StatSection title="Reactions" items={reactions} onRoll={onRoll} onRollFormula={onRollFormula} beastName={b.name} /> : null}
    </Box>
  );
}

// A beast picker row shared by the Wild Shape and Wild Companion panels: a compact
// summary line with an action button, that expands on click to preview the full
// stat block (the same BeastStatBlock shown once the form is active) — letting the
// player read a form before committing to it. The action button stops propagation
// so choosing never gets swallowed by the expand toggle. Rows with no resolved
// `beast` (missing data) aren't expandable.
export function BeastPickerRow({
  beast, name, source, summary, summaryColor,
  actionLabel, onAction, actionDisabled,
  typeLabel = 'Beast', hpLabel = 'HP',
}) {
  const [open, setOpen] = useState(false);
  const expandable = !!beast;
  const Chevron = open ? ChevronDown : ChevronRight;
  return (
    <Box sx={{ ...rowSx, display: 'block', p: 0, overflow: 'hidden', flexShrink: 0 }}>
      <Box
        onClick={expandable ? () => setOpen((o) => !o) : undefined}
        sx={{
          display: 'flex', alignItems: 'center', gap: '8px', px: '8px', py: '5px',
          cursor: expandable ? 'pointer' : 'default',
          '&:hover': expandable ? { bgcolor: uiAlpha(UI_COLORS.accent, 0.06) } : undefined,
        }}
      >
        {expandable
          ? <Chevron size={14} color={UI_COLORS.textMuted} style={{ flexShrink: 0 }} />
          : <Box sx={{ width: 14, flexShrink: 0 }} />}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <BeastNameLink name={name} source={source} sx={{ fontSize: FONT_SIZES.xl }} />
          <Typography noWrap sx={summaryColor ? { ...subSx, color: summaryColor } : subSx}>{summary}</Typography>
        </Box>
        <Button
          size="small"
          variant="outlined"
          disabled={actionDisabled}
          onClick={(e) => { e.stopPropagation(); onAction(); }}
          sx={{ fontSize: FONT_SIZES.sm, flexShrink: 0, borderColor: uiAlpha(UI_COLORS.accent, 0.5), color: UI_COLORS.accentText }}
        >
          {actionLabel}
        </Button>
      </Box>
      {expandable ? (
        <Collapse in={open} unmountOnExit>
          <Box sx={{ px: '8px', pb: '8px', pt: '2px' }}>
            <BeastStatBlock b={beast} typeLabel={typeLabel} hpLabel={hpLabel} />
          </Box>
        </Collapse>
      ) : null}
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
      <Box component="span" sx={{ color: UI_COLORS.accentText, fontWeight: 700 }}>{label}:</Box>{' '}
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
      <Box component="span" sx={{ color: UI_COLORS.accentText, fontWeight: 700 }}>{label}:</Box>{' '}
      <Box component="span" sx={accent ? { color: UI_COLORS.accentText, fontWeight: 700 } : undefined}>{value}</Box>
    </Typography>
  );
}

function StatSection({ title, items, onRoll, onRollFormula, beastName, itemAccessory }) {
  return (
    <Box sx={{ mt: 0.5 }}>
      <Typography sx={{ ...detailTitleSx, fontSize: FONT_SIZES.xxs, mb: 0.2 }}>{title}</Typography>
      {items.map((it, i) => (
        <Typography key={`${it.name}-${i}`} sx={{ ...subSx, mb: 0.2 }}>
          <Box component="span" sx={{ fontStyle: 'italic', fontWeight: 700, color: 'text.primary' }}>{it.name}.</Box>
          {typeof itemAccessory === 'function' ? itemAccessory(it) : null}{' '}
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
  bgcolor: uiAlpha(UI_COLORS.surfaceHeader, 0.6),
  border: 1,
  borderColor: 'divider',
};

const metaSx = { fontSize: FONT_SIZES.xs, fontStyle: 'italic', color: 'text.secondary', letterSpacing: LETTER_SPACINGS.sm };

const rollChipSx = {
  appearance: 'none',
  display: 'inline-flex',
  alignItems: 'baseline',
  border: `1px solid ${uiAlpha(UI_COLORS.accent, 0.45)}`,
  bgcolor: uiAlpha(UI_COLORS.accent, 0.12),
  color: UI_COLORS.accentText,
  borderRadius: 0.5,
  px: '0.28em',
  py: 0,
  font: 'inherit',
  lineHeight: 1.35,
  cursor: 'pointer',
  '&:hover': { bgcolor: uiAlpha(UI_COLORS.accent, 0.24) },
};

export const subSx = { fontSize: FONT_SIZES.xs, color: 'text.secondary' };

// A labelled row of choices above a summon's stat block (form, creature type,
// damage type…), and the toggle look its buttons share.
export function CreatureOptionRow({ label, children }) {
  return (
    <Box sx={{ mb: 0.8 }}>
      <Typography sx={{ ...subSx, mb: 0.3, fontWeight: 700 }}>{label}</Typography>
      {children}
    </Box>
  );
}

export const optionToggleSx = {
  fontSize: FONT_SIZES.xs,
  py: '3px',
  px: '8px',
  textTransform: 'none',
  color: UI_COLORS.accentText,
  borderColor: uiAlpha(UI_COLORS.accent, 0.4),
  '&.Mui-selected': { bgcolor: uiAlpha(UI_COLORS.accentText, 0.18), color: UI_COLORS.accentText },
};

// Muted text button for "dismiss / revert" actions on summon-style panels
// (Wild Companion, Wild Shape, Eldritch Cannon). No outline/icon — a small
// low-emphasis control so it never competes with the roll/HP controls above it.
export const dismissButtonSx = {
  minWidth: 0,
  flexShrink: 0,
  px: 0.8,
  py: 0.1,
  fontSize: FONT_SIZES.xxs,
  fontFamily: UI_FONTS.display,
  letterSpacing: LETTER_SPACINGS.sm,
  color: UI_COLORS.dangerMuted,
  border: 1,
  borderColor: uiAlpha(UI_COLORS.dangerMuted, 0.45),
  borderRadius: 1,
  '&:hover': { borderColor: UI_COLORS.dangerMuted, bgcolor: uiAlpha(UI_COLORS.dangerMuted, 0.1) },
};

// The box holding a summon's HP bar (and, at 0 HP, what brings it back):
// a row panel stacked vertically, set off from the stat block below it.
export const creatureHpBoxSx = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  gap: 0.6,
  p: 0.8,
  mb: 0.8,
  border: 1,
  borderColor: 'divider',
  borderRadius: 1,
  bgcolor: UI_COLORS.surfaceHeader,
};

export const rowSx = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  px: '8px',
  py: '5px',
  border: 1,
  borderColor: 'divider',
  borderRadius: 1,
  bgcolor: UI_COLORS.surfaceHeader,
};
