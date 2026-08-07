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
import {
  ASSIGNABLE_CONDITIONS,
  DEAD_CONDITION_KEY,
  setConditionActive,
  toggleCondition,
} from '../../../shared/character/conditions.js';
import { fullscreenContainer } from '../logic/fullscreenContainer.js';
import { battleMapDialogPaperSx } from './battleMapSurface.js';

// Right-click menu on the piece itself. Label, conditions and removal used to be
// spread between a top-bar button and nothing at all; they belong on the thing
// they act upon.
// `canEdit` is what separates the two audiences. A player gets conditions and
// nothing else: they may mark an enemy as prone, which goes through an RPC that
// writes that one column, but the label, the hit points and the piece itself are
// not theirs to touch.
export default function TokenMenu({
  token, anchor, canEdit = true, canShowHp = true, canRemove = true, canMark = true,
  canSetEffects = true, canSetDeathSaves = true, canStyleObject = true,
  onClose, onSave, onObjectStyle, onVisibility, onDelete,
}) {
  const [label, setLabel] = useState('');
  const [gmOnly, setGmOnly] = useState(false);
  const [conditions, setConditions] = useState([]);
  const [hpCurrent, setHpCurrent] = useState('');
  const [hpMax, setHpMax] = useState('');
  const [showHp, setShowHp] = useState(false);
  const [effects, setEffects] = useState([]);
  const [deathSaves, setDeathSaves] = useState({ success: 0, fail: 0 });
  const syncedIdRef = useRef(null);
  const typingTimerRef = useRef(null);
  const objectStyleTimerRef = useRef(null);

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
    setDeathSaves(deathSavesForToken(token.deathSaves, token.conditions, token.characterId));
  }, [token]);

  useEffect(() => () => clearTimeout(typingTimerRef.current), []);

  // Every control writes as it is used. A Save button in a menu opened by
  // right-clicking a piece mid-combat is one click too many, and forgetting it
  // loses the change silently.
  const save = useCallback((patch) => {
    if (!token) return;
    const next = {
      label, gmOnly, conditions, showHp, effects, hpCurrent, hpMax, deathSaves, ...patch,
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
      deathSaves: deathSavesForToken(next.deathSaves, next.conditions, token.characterId),
    });
  }, [conditions, deathSaves, effects, gmOnly, hpCurrent, hpMax, label, onSave, showHp, token]);

  // Typing is the one thing not written per keystroke: that would be a row
  // version per character, and a realtime event for each one.
  const saveSoon = useCallback((patch) => {
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => save(patch), TYPING_DELAY);
  }, [save]);

  if (!token) return null;
  const isMapObject = Boolean(token.iconKey);
  // Read off the piece rather than kept in state: the layer is written
  // optimistically and rolled back if the database refuses, and a local copy
  // would keep showing the tick that never took.
  const hiddenFromPlayers = token.layer === 'gm';


  return (
    <Menu
      open={Boolean(anchor)}
      onClose={onClose}
      anchorReference="anchorPosition"
      anchorPosition={anchor ? { top: anchor.y, left: anchor.x } : undefined}
      container={fullscreenContainer}
      slotProps={{
        paper: {
          sx: {
            ...battleMapDialogPaperSx,
            width: isMapObject ? 270 : 360,
            maxWidth: 'calc(100vw - 16px)',
            maxHeight: 'calc(100vh - 16px)',
            '& .MuiMenu-list': { p: 0 },
          },
        },
      }}
    >
      <Stack spacing={0.65} sx={{ px: 1, py: 0.75 }}>
        {/* Whether the table sees the piece at all. A trap, a hoard or anything
            else dragged onto the GM layer arrives with this already ticked,
            because that is where it landed — clearing it is how the GM springs
            the trap. First in the menu: mid-scene this is the control being
            reached for, not the label. */}
        {onVisibility ? (
          <>
            <FormControlLabel
              control={(
                <Checkbox
                  size="small"
                  checked={hiddenFromPlayers}
                  onChange={(event) => onVisibility(token, event.target.checked)}
                />
              )}
              label={<Typography sx={controlLabelSx}>Hidden from the players</Typography>}
              sx={formControlSx}
            />
            <Typography sx={helperSx}>
              {hiddenFromPlayers
                ? 'On the GM layer: the players are never sent this piece at all.'
                : 'On the token layer: everyone at the table can see it.'}
            </Typography>
            <Divider />
          </>
        ) : null}

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
            sx={compactFieldSx}
          />
          <FormControlLabel
            control={(
              <Checkbox
                size="small"
                checked={gmOnly}
                onChange={(event) => { setGmOnly(event.target.checked); save({ gmOnly: event.target.checked }); }}
              />
            )}
            label={<Typography sx={controlLabelSx}>Label visible to the GM only</Typography>}
            sx={formControlSx}
          />
          <Typography sx={helperSx}>
            {gmOnly
              ? 'The name is stored apart from the piece: the players never receive it.'
              : 'The name is shown to everyone who can see this piece.'}
          </Typography>

          {!isMapObject ? <>
          <Divider />

          {/* Hit points are editable only where the piece owns them. For a
              character the sheet is the source of truth, and a field here would
              edit a copy that the next sheet update overwrites. */}
          {token.characterId ? (
            <Typography sx={helperSx}>
              Hit points come from the character sheet and update by themselves.
            </Typography>
          ) : (
            <Stack direction="row" spacing={0.6} sx={{ alignItems: 'center' }}>
              <TextField
                label="HP"
                size="small"
                type="number"
                value={hpCurrent}
                onChange={(event) => {
                  const value = event.target.value;
                  setHpCurrent(value);
                  if (value === '') {
                    saveSoon({ hpCurrent: value });
                    return;
                  }
                  const nextConditions = setConditionActive(
                    conditions,
                    DEAD_CONDITION_KEY,
                    Number(value) <= 0,
                  );
                  setConditions(nextConditions);
                  saveSoon({ hpCurrent: value, conditions: nextConditions });
                }}
                onBlur={() => save({})}
                onKeyDown={(event) => {
                  event.stopPropagation();
                  if (event.key === 'Enter') { save({}); onClose(); }
                }}
                sx={{ ...compactFieldSx, width: 82 }}
              />
              <Typography sx={slashSx}>/</Typography>
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
                sx={{ ...compactFieldSx, width: 82 }}
              />
            </Stack>
          )}

          <Divider />
          </> : null}
          </>
        ) : null}

        {isMapObject ? (
          <Box sx={objectStyleSx}>
            <Box>
              <Typography sx={sectionTitleSx}>Object color</Typography>
              <Typography sx={helperSx}>The color is saved after you stop moving the selector.</Typography>
            </Box>
            <Box
              key={`${token.id}-color`}
              component="input"
              type="color"
              aria-label="Object color"
              title="Object color"
              disabled={!canStyleObject}
              defaultValue={token.color || '#e8c96a'}
              onInput={(event) => {
                const color = event.currentTarget.value;
                clearTimeout(objectStyleTimerRef.current);
                objectStyleTimerRef.current = setTimeout(() => {
                  onObjectStyle?.(token, { color });
                }, OBJECT_STYLE_DELAY);
              }}
              sx={objectColorInputSx}
            />
          </Box>
        ) : null}

        {/* Whether a piece wears a bar is its owner's call, GM or player: it is
            an ordinary column on a row they already control. */}
        {canShowHp && !isMapObject ? (
          <FormControlLabel
            control={(
              <Checkbox
                size="small"
                checked={showHp}
                onChange={(event) => { setShowHp(event.target.checked); save({ showHp: event.target.checked }); }}
              />
            )}
            label={<Typography sx={controlLabelSx}>Show the hit point bar</Typography>}
            sx={formControlSx}
          />
        ) : null}

        {!isMapObject && token.characterId && Number(hpCurrent) === 0 ? (
          <DeathSaveControls
            deathSaves={deathSaves}
            disabled={!canSetDeathSaves}
            onChange={(type, value) => {
              const current = deathSaves[type];
              const nextValue = current === value ? value - 1 : value;
              const nextDeathSaves = { ...deathSaves, [type]: Math.max(0, Math.min(3, nextValue)) };
              const dead = nextDeathSaves.fail >= 3;
              const nextConditions = setConditionActive(conditions, DEAD_CONDITION_KEY, dead);
              setDeathSaves(nextDeathSaves);
              setConditions(nextConditions);
              save({
                deathSaves: nextDeathSaves,
                conditions: nextConditions,
                ...(dead ? { hpCurrent: 0 } : {}),
              });
            }}
          />
        ) : null}

        {!isMapObject ? <Box sx={markerGridSx}>
          <Box sx={markerSectionSx}>
            <Typography sx={sectionTitleSx}>Conditions</Typography>
            {!canMark ? <Typography sx={helperSx}>Only its player or the GM can set these.</Typography> : null}
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
                      if (condition.key !== DEAD_CONDITION_KEY) {
                        save({ conditions: next });
                        return;
                      }
                      const dead = next.includes(DEAD_CONDITION_KEY);
                      const nextHp = dead ? 0 : 1;
                      const nextDeathSaves = token.characterId
                        ? (dead ? { success: 0, fail: 3 } : { success: 0, fail: 0 })
                        : deathSaves;
                      setHpCurrent(nextHp);
                      setDeathSaves(nextDeathSaves);
                      save({
                        conditions: next,
                        hpCurrent: nextHp,
                        deathSaves: nextDeathSaves,
                      });
                    } : undefined}
                    sx={compactChipSx}
                  />
                );
              })}
            </Box>
          </Box>

          {/* Advantage and disadvantage, from the same table the encounter builder
              uses — a matrix rather than a list, because the choice being made is
              "advantage or disadvantage on X", not "which of twelve flags". */}
          <Box sx={{ ...markerSectionSx, ...effectSectionSx }}>
            <Typography sx={sectionTitleSx}>Advantage / disadvantage</Typography>
            {!canSetEffects ? <Typography sx={helperSx}>Only its player or the GM can set these.</Typography> : null}
            {EFFECT_GROUPS.map((group) => (
              <Stack key={group.target} spacing={0.2}>
                <Typography sx={groupLabelSx}>{group.label}</Typography>
                {group.rows.map((row) => (
                  <Stack key={row.roll} direction="row" spacing={0.3} sx={effectRowSx}>
                    <Typography sx={effectLabelSx}>{row.label}</Typography>
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
                          sx={effectChipSx}
                        />
                      );
                    })}
                  </Stack>
                ))}
              </Stack>
            ))}
          </Box>
        </Box> : null}

        <Divider />

        <Stack direction="row" spacing={0.6}>
          <Button size="small" variant="outlined" onClick={onClose} sx={{ ...menuButtonSx, flex: 1 }}>Done</Button>
          {/* A player may take back what they put down — their own piece or a
              marker they dropped — and the delete policy says the same. */}
          {canRemove ? (
            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={<Trash2 size={14} />}
              onClick={() => { onDelete(token); onClose(); }}
              sx={menuButtonSx}
            >
              Remove
            </Button>
          ) : null}
        </Stack>
      </Stack>
    </Menu>
  );
}

function DeathSaveControls({ deathSaves, disabled, onChange }) {
  return (
    <Box sx={deathSavePanelSx}>
      <Typography sx={sectionTitleSx}>Death saves</Typography>
      <Box sx={deathSaveRowsSx}>
        {[['success', 'Success', '#70b78f'], ['fail', 'Failure', '#d76767']].map(([type, label, color]) => (
          <Box key={type} sx={deathSaveRowSx}>
            <Typography sx={deathSaveLabelSx}>{label}</Typography>
            {[1, 2, 3].map((value) => (
              <Box
                key={value}
                component="button"
                type="button"
                aria-label={`${label} ${value}`}
                disabled={disabled}
                data-active={deathSaves[type] >= value ? 'true' : 'false'}
                onClick={() => onChange(type, value)}
                sx={{
                  ...deathSaveDotSx,
                  borderColor: color,
                  bgcolor: deathSaves[type] >= value ? color : 'transparent',
                }}
              />
            ))}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function normalizeDeathSaves(value) {
  const raw = value || {};
  const clamp = (entry) => Math.max(0, Math.min(3, Math.round(Number(entry) || 0)));
  return { success: clamp(raw.success ?? raw.s), fail: clamp(raw.fail ?? raw.f) };
}

function deathSavesForToken(value, conditions, characterId) {
  const normalized = normalizeDeathSaves(value);
  return characterId && (conditions || []).includes(DEAD_CONDITION_KEY)
    ? { ...normalized, fail: 3 }
    : normalized;
}

// Long enough that a word is not written mid-keystroke, short enough that
// closing the menu straight after typing still catches it.
const TYPING_DELAY = 400;
const OBJECT_STYLE_DELAY = 180;

const compactFieldSx = {
  '& .MuiInputBase-root': { height: 34, fontSize: '0.72rem' },
  '& .MuiInputLabel-root': { fontSize: '0.68rem' },
  '& .MuiInputLabel-shrink': { transform: 'translate(14px, -7px) scale(0.75)' },
};

const formControlSx = {
  m: 0,
  minHeight: 24,
  '& .MuiCheckbox-root': { p: 0.35, mr: 0.25 },
  '& .MuiSvgIcon-root': { fontSize: 17 },
};

const controlLabelSx = { fontSize: '0.68rem', lineHeight: 1.2 };
const helperSx = { color: 'text.secondary', fontSize: '0.57rem', lineHeight: 1.25 };
const slashSx = { color: 'text.secondary', fontSize: '0.68rem' };

const objectStyleSx = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) 34px',
  alignItems: 'center',
  gap: 0.6,
  p: 0.6,
  border: '1px solid rgba(232,201,106,0.16)',
  borderRadius: 1,
};
const objectColorInputSx = {
  width: 32,
  height: 32,
  p: '2px',
  border: '1px solid rgba(232,201,106,0.42)',
  borderRadius: 1,
  bgcolor: 'rgba(0,0,0,0.3)',
  cursor: 'pointer',
  '&:disabled': { cursor: 'default', opacity: 0.45 },
};

const markerGridSx = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.08fr)',
  border: '1px solid rgba(232,201,106,0.16)',
  borderRadius: 1,
  overflow: 'hidden',
};

const deathSavePanelSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 0.8,
  px: 0.6,
  py: 0.4,
  border: '1px solid rgba(232,201,106,0.16)',
  borderRadius: 1,
};
const deathSaveRowsSx = { display: 'flex', gap: 1 };
const deathSaveRowSx = { display: 'flex', alignItems: 'center', gap: 0.3 };
const deathSaveLabelSx = { fontSize: '0.55rem', color: 'text.secondary', mr: 0.1 };
const deathSaveDotSx = {
  width: 13,
  height: 13,
  p: 0,
  border: '1px solid',
  borderRadius: '50%',
  cursor: 'pointer',
  '&:disabled': { cursor: 'default', opacity: 0.45 },
};

const markerSectionSx = {
  minWidth: 0,
  p: 0.6,
  display: 'flex',
  flexDirection: 'column',
  gap: 0.35,
};

const effectSectionSx = { borderLeft: '1px solid rgba(232,201,106,0.16)' };
const sectionTitleSx = {
  color: 'text.secondary',
  fontSize: '0.6rem',
  fontWeight: 800,
  letterSpacing: '0.035em',
  lineHeight: 1.2,
};

const chipsSx = {
  display: 'flex',
  flexWrap: 'wrap',
  alignContent: 'flex-start',
  gap: 0.3,
  maxHeight: 150,
  overflowY: 'auto',
};

const compactChipSx = {
  height: 20,
  '& .MuiChip-label': { px: 0.55, fontSize: '0.57rem', lineHeight: 1 },
};

const groupLabelSx = {
  mt: 0.15,
  color: 'text.disabled',
  fontSize: '0.54rem',
  fontWeight: 700,
  lineHeight: 1.15,
};

const effectRowSx = { alignItems: 'center', minHeight: 20 };
const effectLabelSx = {
  flex: 1,
  minWidth: 0,
  fontSize: '0.56rem',
  lineHeight: 1.05,
};

const effectChipSx = {
  minWidth: 34,
  height: 19,
  '& .MuiChip-label': { px: 0.4, fontSize: '0.52rem', fontWeight: 800 },
};

const menuButtonSx = {
  minHeight: 28,
  py: 0.25,
  fontSize: '0.62rem',
};
