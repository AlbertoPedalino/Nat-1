import { useState } from 'react';
import { Box, Button, Chip, Menu, MenuItem, TextField, Tooltip } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Check, ChevronDown, X } from 'lucide-react';
import {
  EFFECT_DURATIONS,
  EFFECT_GROUPS,
  MAX_EFFECTS,
  MAX_EFFECT_TEXT,
  describeEffect,
  durationShort,
  effectId,
  effectPolarity,
  effectShortLabel,
  normalizeEffects,
} from '../../../shared/character/combatEffects.js';
import { useEncounterBuilder } from '../state/EncounterBuilderContext.jsx';
import MarkerRow from './MarkerRow.jsx';

// Ad-hoc effects on a combatant, sharing the MarkerRow frame with the conditions
// row directly above: pills always visible so the initiative list can be
// scanned, the assignment surface behind a disclosure.
//
// The two rows are separate because they answer different questions. A condition
// is a rules state the creature IS in and it rides to the player's sheet; an
// effect is a one-off ruling this fight only ("disadvantage on its next
// attack"), and merging them would imply the effects sync too.
//
// The grid is a matrix rather than a list of chips: the GM's decision is
// "advantage or disadvantage on X", so ADV and DIS sit side by side on the row
// for X. Green/red carry the polarity, which is why the pills do not reuse the
// conditions accent.
//
// Duration belongs to the effect, so it is set ON the pill: assigning an effect
// gives it the default and clicking it opens its own duration menu. A single
// picker beside the grid could not express what a combatant routinely has —
// disadvantage on its next attack AND disadvantage on saves until removed — and
// silently retimed whatever was tapped next.

export default function CombatantEffects({ combatant }) {
  const { dispatch } = useEncounterBuilder();
  const [text, setText] = useState('');
  const active = normalizeEffects(combatant.activeEffects);
  // `active` is already normalized, so pressed state is a set lookup rather than
  // re-normalizing the whole list once per grid button.
  const activeKeys = new Set(active.map((effect) => effect.key));
  // The list is capped, and a cap that silently swallows a click is worse than
  // no cap: at the limit the controls that could only ADD are disabled and say
  // why, while anything already active stays clickable so it can be removed.
  const full = active.length >= MAX_EFFECTS;
  const fullReason = `Limit of ${MAX_EFFECTS} effects reached — remove one first`;

  const toggle = (key) => dispatch({ type: 'toggleCombatantEffect', id: combatant.id, key });
  const addCustom = () => {
    if (!text.trim()) return;
    dispatch({ type: 'addCombatantEffect', id: combatant.id, payload: { text, polarity: 'note' } });
    setText('');
  };

  return (
    <MarkerRow
      label="Effects"
      count={active.length}
      onClear={() => dispatch({ type: 'clearCombatantEffects', id: combatant.id })}
      pills={active.map((effect) => (
        <EffectPill
          key={effectId(effect)}
          effect={effect}
          onRetime={(duration) => dispatch({
            type: 'setCombatantEffectDuration', id: combatant.id, effectId: effectId(effect), duration,
          })}
          onRemove={() => dispatch({ type: 'removeCombatantEffect', id: combatant.id, effectId: effectId(effect) })}
        />
      ))}
    >
      <Box sx={panelSx}>
        {EFFECT_GROUPS.map((group) => (
          <Box key={group.target} sx={groupSx}>
            <Box component="span" sx={captionSx}>{group.label}</Box>
            {group.rows.map((row) => (
              <Box key={row.roll} sx={gridRowSx}>
                <Box component="span" sx={gridLabelSx}>{row.label}</Box>
                {POLARITIES.map((polarity) => {
                  // A row only carries the polarities the catalog defines for
                  // it. A spacer keeps the columns lined up across rows when
                  // one is missing, rather than a dead button to click.
                  const key = row[polarity];
                  if (!key) return <Box key={polarity} sx={polaritySpacerSx} />;
                  const on = activeKeys.has(key);
                  return (
                    <PolarityButton
                      key={polarity}
                      polarity={polarity}
                      active={on}
                      disabledReason={!on && full ? fullReason : null}
                      onClick={() => toggle(key)}
                      label={`${POLARITY_WORD[polarity]} on ${row.label.toLowerCase()} (${group.label.toLowerCase()})`}
                    />
                  );
                })}
              </Box>
            ))}
          </Box>
        ))}

        {/* Free text for the rulings no table can enumerate ("+2 AC from
            cover", "takes 5 extra fire damage"). Kept polarity-neutral: it
            is a reminder, not an advantage call. */}
        <Box sx={customRowSx}>
          <TextField
            size="small"
            placeholder={full ? fullReason : 'Other effect…'}
            value={text}
            disabled={full}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              event.preventDefault();
              addCustom();
            }}
            slotProps={{ htmlInput: { maxLength: MAX_EFFECT_TEXT, 'aria-label': 'Custom effect' } }}
            sx={customFieldSx}
          />
          <Button size="small" onClick={addCustom} disabled={full || !text.trim()} sx={addSx}>Add</Button>
        </Box>
      </Box>
    </MarkerRow>
  );
}

// Body opens this effect's duration menu, the X removes it — the same two-action
// split the condition pill uses, advertised the same way with a chevron so they
// stay tellable apart.
//
// The menu is owned here rather than by the parent: it belongs to exactly one
// effect, and hoisting it meant the parent held an anchor+id+duration triple and
// had to find somewhere outside the collapsible panel to render it. MUI unmounts
// a closed Menu, so the copy per pill costs nothing while closed.
function EffectPill({ effect, onRetime, onRemove }) {
  const [anchor, setAnchor] = useState(null);
  const polarity = effectPolarity(effect);
  const short = durationShort(effect.duration);
  const tag = POLARITY_TAG[polarity];
  const choose = (duration) => {
    onRetime(duration);
    setAnchor(null);
  };
  return (
    <>
      <Tooltip title={`${describeEffect(effect)} — click to re-time`}>
        <Chip
          size="small"
          label={`${tag ? `${tag} ` : ''}${effectShortLabel(effect)}${short ? ` · ${short}` : ''}`}
          icon={<ChevronDown size={11} />}
          onClick={(event) => setAnchor(event.currentTarget)}
          onDelete={onRemove}
          deleteIcon={<X size={12} />}
          sx={(theme) => {
            const accent = accentFor(theme, polarity);
            return {
              height: 20,
              fontSize: '0.62rem',
              maxWidth: '100%',
              cursor: 'pointer',
              color: accent,
              borderColor: accent,
              bgcolor: alpha(accent, 0.14),
              '& .MuiChip-icon, & .MuiChip-deleteIcon': { color: accent },
              '&:hover': { bgcolor: alpha(accent, 0.24) },
            };
          }}
        />
      </Tooltip>
      <Menu
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        slotProps={{ list: { dense: true, 'aria-label': 'Effect duration' } }}
      >
        {EFFECT_DURATIONS.map((option) => (
          <MenuItem
            key={option.key}
            // The four durations are one mutually exclusive choice, not four
            // commands, so the menu announces itself as a radio group.
            role="menuitemradio"
            aria-checked={effect.duration === option.key}
            selected={effect.duration === option.key}
            onClick={() => choose(option.key)}
            sx={menuItemSx}
          >
            <Box component="span" sx={menuCheckSx}>
              {effect.duration === option.key ? <Check size={12} /> : null}
            </Box>
            {option.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

// `disabledReason` doubles as the disabled flag and as the tooltip that explains
// it — a control that stops responding without saying why is the thing the
// effect cap must not become. Tooltip needs a live wrapper to catch the hover,
// since a disabled button fires no mouse events.
function PolarityButton({ polarity, active, onClick, label, disabledReason }) {
  return (
    <Tooltip title={disabledReason || label}>
      <Box component="span" sx={polarityWrapSx}>
        <Box
          component="button"
          type="button"
          onClick={onClick}
          disabled={!!disabledReason}
          aria-pressed={active}
          aria-label={label}
          sx={(theme) => {
            const accent = accentFor(theme, polarity);
            return {
              ...polarityButtonSx,
              color: active ? accent : 'text.secondary',
              borderColor: active ? accent : 'divider',
              bgcolor: active ? alpha(accent, 0.16) : 'transparent',
              '&:hover': { borderColor: accent, color: accent },
              '&:disabled': { opacity: 0.35, cursor: 'default', borderColor: 'divider', color: 'text.secondary' },
            };
          }}
        >
          {POLARITY_TAG[polarity]}
        </Box>
      </Box>
    </Tooltip>
  );
}

// The two columns of the assignment grid, in render order.
const POLARITIES = ['adv', 'disadv'];

const POLARITY_TAG = { adv: 'ADV', disadv: 'DIS', note: '' };

const POLARITY_WORD = { adv: 'Advantage', disadv: 'Disadvantage' };

// Polarity is the whole message here, so it is read straight off the palette's
// success / error tones rather than given a new accent of its own.
function accentFor(theme, polarity) {
  if (polarity === 'adv') return theme.palette.success.main;
  if (polarity === 'disadv') return theme.palette.error.main;
  return theme.palette.info.main;
}

const panelSx = { display: 'flex', flexDirection: 'column', gap: 0.6, mt: 0.6 };

const captionSx = {
  fontSize: '0.56rem',
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'text.secondary',
};

const menuItemSx = { fontSize: '0.7rem', minHeight: 0, py: 0.5 };

const menuCheckSx = { display: 'inline-flex', width: 16, flex: '0 0 auto' };

const groupSx = { display: 'flex', flexDirection: 'column', gap: 0.3 };

const gridRowSx = { display: 'flex', alignItems: 'center', gap: 0.4 };

const gridLabelSx = {
  flex: '1 1 auto',
  minWidth: 0,
  fontSize: '0.66rem',
  color: 'text.primary',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

// Fixed width on the wrapper, not only on the button, so a row that is missing
// one polarity can hold its column open with an empty span of the same size.
const polarityWrapSx = { display: 'inline-flex', flex: '0 0 auto', width: 38 };

const polaritySpacerSx = polarityWrapSx;

const polarityButtonSx = {
  width: '100%',
  py: '1px',
  border: 1,
  borderRadius: 1,
  fontFamily: 'inherit',
  fontSize: '0.56rem',
  fontWeight: 800,
  letterSpacing: '0.06em',
  lineHeight: 1.5,
  cursor: 'pointer',
  transition: 'color 120ms ease, border-color 120ms ease, background-color 120ms ease',
};

const customRowSx = { display: 'flex', alignItems: 'center', gap: 0.5 };

const customFieldSx = {
  flex: '1 1 auto',
  minWidth: 0,
  '& .MuiInputBase-input': { py: 0.4, fontSize: '0.68rem' },
};

const addSx = {
  flex: '0 0 auto',
  minWidth: 0,
  px: 0.8,
  py: 0,
  fontSize: '0.6rem',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
};

// A collapsed Collapse still earns a slot in the parent flex gap; MUI tags that
// state once the exit transition ends, so drop it out of layout there.
const collapseSx = { '&.MuiCollapse-hidden': { display: 'none' } };
