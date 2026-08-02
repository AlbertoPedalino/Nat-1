import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  FormControlLabel,
  Menu,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Trash2 } from 'lucide-react';
import { EFFECT_GROUPS, toggleEffect } from '../../../shared/character/combatEffects.js';
import { ASSIGNABLE_CONDITIONS, toggleCondition } from '../../../shared/character/conditions.js';
import { fullscreenContainer } from '../logic/fullscreenContainer.js';

// Right-click menu on the piece itself. Label, conditions and removal used to be
// spread between a top-bar button and nothing at all; they belong on the thing
// they act upon.
// `canEdit` is what separates the two audiences. A player gets conditions and
// nothing else: they may mark an enemy as prone, which goes through an RPC that
// writes that one column, but the label, the hit points and the piece itself are
// not theirs to touch.
export default function TokenMenu({
  token, anchor, canEdit = true, canShowHp = true, canRemove = true, canMark = true,
  canSetEffects = true, onClose, onSave, onDelete,
}) {
  const [label, setLabel] = useState('');
  const [gmOnly, setGmOnly] = useState(false);
  const [conditions, setConditions] = useState([]);
  const [hpCurrent, setHpCurrent] = useState('');
  const [hpMax, setHpMax] = useState('');
  const [showHp, setShowHp] = useState(false);
  const [effects, setEffects] = useState([]);
  const syncedIdRef = useRef(null);
  const typingTimerRef = useRef(null);

  // Loaded once per piece, keyed by id rather than by object identity: a
  // realtime update rebuilds the token on every render, and resyncing on that
  // would wipe whatever is half-typed in the fields.
  useEffect(() => {
    if (!token || syncedIdRef.current === token.id) return;
    syncedIdRef.current = token.id;
    const secret = token.secretLabel || '';
    setGmOnly(Boolean(secret));
    setLabel(secret || token.label || '');
    setConditions(token.conditions || []);
    setHpCurrent(token.hpCurrent ?? '');
    setHpMax(token.hpMax ?? '');
    setShowHp(Boolean(token.showHp));
    setEffects(token.effects || []);
  }, [token]);

  useEffect(() => () => clearTimeout(typingTimerRef.current), []);

  // Every control writes as it is used. A Save button in a menu opened by
  // right-clicking a piece mid-combat is one click too many, and forgetting it
  // loses the change silently.
  const save = useCallback((patch) => {
    if (!token) return;
    const next = {
      label, gmOnly, conditions, showHp, effects, hpCurrent, hpMax, ...patch,
    };
    onSave(token, {
      label: next.label,
      gmOnly: next.gmOnly,
      conditions: next.conditions,
      effects: next.effects,
      showHp: next.showHp,
      // Blank clears them rather than writing a zero, which would read as a
      // dead creature.
      hpCurrent: next.hpCurrent === '' ? null : Number(next.hpCurrent),
      hpMax: next.hpMax === '' ? null : Number(next.hpMax),
    });
  }, [conditions, effects, gmOnly, hpCurrent, hpMax, label, onSave, showHp, token]);

  // Typing is the one thing not written per keystroke: that would be a row
  // version per character, and a realtime event for each one.
  const saveSoon = useCallback((patch) => {
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => save(patch), TYPING_DELAY);
  }, [save]);

  if (!token) return null;


  return (
    <Menu
      open={Boolean(anchor)}
      onClose={onClose}
      anchorReference="anchorPosition"
      anchorPosition={anchor ? { top: anchor.y, left: anchor.x } : undefined}
      container={fullscreenContainer}
      slotProps={{ paper: { sx: { width: 280 } } }}
    >
      <Stack spacing={1.25} sx={{ px: 1.5, py: 1 }}>
        {canEdit ? (
          <>
          <TextField
            label="Label"
            size="small"
            autoFocus
            value={label}
            onChange={(event) => {
              setLabel(event.target.value);
              saveSoon({ label: event.target.value });
            }}
            onBlur={() => save({})}
            onKeyDown={(event) => {
              // The menu swallows keys otherwise. Enter closes rather than
              // saving, because saving has already happened.
              event.stopPropagation();
              if (event.key === 'Enter') { save({}); onClose(); }
            }}
          />
          <FormControlLabel
            control={(
              <Checkbox
                size="small"
                checked={gmOnly}
                onChange={(event) => { setGmOnly(event.target.checked); save({ gmOnly: event.target.checked }); }}
              />
            )}
            label={<Typography variant="body2">Visible to the GM only</Typography>}
          />
          <Typography variant="caption" color="text.secondary">
            {gmOnly
              ? 'Stored apart from the token: the players never receive it.'
              : 'Shown to everyone who can see this piece.'}
          </Typography>

          <Divider />

          {/* Hit points are editable only where the piece owns them. For a
              character the sheet is the source of truth, and a field here would
              edit a copy that the next sheet update overwrites. */}
          {token.characterId ? (
            <Typography variant="caption" color="text.secondary">
              Hit points come from the character sheet and update by themselves.
            </Typography>
          ) : (
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <TextField
                label="HP"
                size="small"
                type="number"
                value={hpCurrent}
                onChange={(event) => {
                  setHpCurrent(event.target.value);
                  saveSoon({ hpCurrent: event.target.value });
                }}
                onBlur={() => save({})}
                onKeyDown={(event) => {
                  event.stopPropagation();
                  if (event.key === 'Enter') { save({}); onClose(); }
                }}
                sx={{ width: 90 }}
              />
              <Typography variant="body2" color="text.secondary">/</Typography>
              <TextField
                label="Max"
                size="small"
                type="number"
                value={hpMax}
                onChange={(event) => {
                  setHpMax(event.target.value);
                  saveSoon({ hpMax: event.target.value });
                }}
                onBlur={() => save({})}
                onKeyDown={(event) => {
                  event.stopPropagation();
                  if (event.key === 'Enter') { save({}); onClose(); }
                }}
                sx={{ width: 90 }}
              />
            </Stack>
          )}

          <Divider />
          </>
        ) : null}

        {/* Whether a piece wears a bar is its owner's call, GM or player: it is
            an ordinary column on a row they already control. */}
        {canShowHp ? (
          <FormControlLabel
            control={(
              <Checkbox
                size="small"
                checked={showHp}
                onChange={(event) => { setShowHp(event.target.checked); save({ showHp: event.target.checked }); }}
              />
            )}
            label={<Typography variant="body2">Show the hit point bar</Typography>}
          />
        ) : null}

        <Typography variant="caption" color="text.secondary">
          Conditions
          {canMark ? null : ' — this character’s own player or the GM sets these'}
        </Typography>
        <Box sx={chipsSx}>
          {ASSIGNABLE_CONDITIONS.map((condition) => {
            const active = conditions.includes(condition.key);
            return (
              <Chip
                key={condition.key}
                size="small"
                label={condition.label}
                variant={active ? 'filled' : 'outlined'}
                color={active ? 'warning' : 'default'}
                disabled={!canMark}
                onClick={canMark ? () => {
                  const next = toggleCondition(conditions, condition.key);
                  setConditions(next);
                  save({ conditions: next });
                } : undefined}
              />
            );
          })}
        </Box>

        <Divider />

        {/* Advantage and disadvantage, from the same table the encounter builder
            uses — a matrix rather than a list, because the choice being made is
            "advantage or disadvantage on X", not "which of twelve flags". */}
        <Typography variant="caption" color="text.secondary">
          Advantage / disadvantage
          {canSetEffects ? null : ' — this character’s own player or the GM sets these'}
        </Typography>
        {EFFECT_GROUPS.map((group) => (
          <Stack key={group.target} spacing={0.5}>
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>{group.label}</Typography>
            {group.rows.map((row) => (
              <Stack key={row.roll} direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                <Typography variant="caption" sx={{ flex: 1, minWidth: 0 }}>{row.label}</Typography>
                {[['adv', 'ADV', 'success'], ['disadv', 'DIS', 'error']].map(([kind, text, colour]) => {
                  const key = row[kind];
                  if (!key) return null;
                  const active = effects.some((effect) => effect.key === key);
                  return (
                    <Chip
                      key={key}
                      size="small"
                      label={text}
                      variant={active ? 'filled' : 'outlined'}
                      color={active ? colour : 'default'}
                      disabled={!canSetEffects}
                      onClick={canSetEffects ? () => {
                        const next = toggleEffect(effects, key);
                        setEffects(next);
                        save({ effects: next });
                      } : undefined}
                      sx={{ minWidth: 46 }}
                    />
                  );
                })}
              </Stack>
            ))}
          </Stack>
        ))}

        <Divider />

        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" onClick={onClose} sx={{ flex: 1 }}>Done</Button>
          {/* A player may take back what they put down — their own piece or a
              marker they dropped — and the delete policy says the same. */}
          {canRemove ? (
            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={<Trash2 size={14} />}
              onClick={() => { onDelete(token); onClose(); }}
            >
              Remove
            </Button>
          ) : null}
        </Stack>
      </Stack>
    </Menu>
  );
}

// Long enough that a word is not written mid-keystroke, short enough that
// closing the menu straight after typing still catches it.
const TYPING_DELAY = 400;

const chipsSx = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 0.5,
  maxHeight: 132,
  overflowY: 'auto',
};
