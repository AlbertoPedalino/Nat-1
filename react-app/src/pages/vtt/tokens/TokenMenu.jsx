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
import { ScrollText, Trash2 } from 'lucide-react';
import { VTT_COLORS } from '../../../shared/vtt/colors.js';
import { addReminder, removeEffect } from '../../../shared/character/combat/combatEffects.js';
import { ReminderEditor } from '../../../shared/character/combat/ReminderChips.jsx';
import HpStepper from '../../../shared/character/combat/HpStepper.jsx';
import { applyMonsterVitalCommand } from '../../../shared/vtt/tokens/fightVitals.js';
import {
  ASSIGNABLE_CONDITIONS,
  DEAD_CONDITION_KEY,
  setConditionActive,
  toggleCondition,
} from '../../../shared/character/combat/conditions.js';
import { fullscreenContainer } from '../map/fullscreenContainer.js';
import { coarsePointer, useMenuPlacement } from '../map/menuPlacement.js';
import { battleMapDialogPaperSx } from '../map/battleMapSurface.js';

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
  // Set for the GM: temporary and maximum hit points and the "+ 5 -" stepper,
  // as health commands (modifyHp, setTempHp, ...) whatever the piece is.
  onVitals = null,
  // Set only for a creature whose stat block the GM can open from here.
  onStatBlock = null,
  // Set only for a character whose sheet this user can open (the GM any,
  // a player their own): the touch way to what a click on the piece does.
  onSheet = null,
}) {
  const [label, setLabel] = useState('');
  const [gmOnly, setGmOnly] = useState(false);
  const [conditions, setConditions] = useState([]);
  const [hpCurrent, setHpCurrent] = useState('');
  const [hpMax, setHpMax] = useState('');
  const [tempHp, setTempHp] = useState('');
  // How far the maximum stands above (or below) the base one: a character's
  // sheet, an encounter creature's, or a loose piece's maximum last typed.
  const [maxBonus, setMaxBonus] = useState(0);
  // One "+ 5 -" for the three fields: it acts on the one the cursor was last
  // in, HP until another is picked. The amount stays between pieces.
  const [stepTarget, setStepTarget] = useState('hp');
  const [stepAmount, setStepAmount] = useState('5');
  const [showHp, setShowHp] = useState(false);
  const [effects, setEffects] = useState([]);
  const [deathSaves, setDeathSaves] = useState({ success: 0, fail: 0 });
  // At the press; on a touch screen left there while typing, lifted only to
  // keep the field above the keyboard.
  const placement = useMenuPlacement(anchor);
  const syncedIdRef = useRef(null);
  const typingTimerRef = useRef(null);
  const pendingPatchRef = useRef({});
  const objectStyleTimerRef = useRef(null);
  const vitalsTimerRef = useRef(null);
  const pendingVitalsRef = useRef({});

  // Loaded once per opening, keyed by id rather than by object identity: a
  // realtime update rebuilds the token on every render, and resyncing on that
  // would wipe whatever is half-typed in the fields. The menu stays mounted
  // while closed, so closing forgets the piece: reopening the same one must
  // read it again, or its next edit writes back what this screen saw last time.
  useEffect(() => {
    if (!token) {
      syncedIdRef.current = null;
      return;
    }
    if (syncedIdRef.current === token.id) return;
    syncedIdRef.current = token.id;
    pendingPatchRef.current = {};
    clearTimeout(typingTimerRef.current);
    pendingVitalsRef.current = {};
    clearTimeout(vitalsTimerRef.current);
    setStepTarget('hp');
    const secret = token.secretLabel || '';
    setGmOnly(Boolean(secret));
    setLabel(secret || token.label || '');
    setConditions(token.conditions || []);
    setHpCurrent(token.hpCurrent ?? '');
    setHpMax(token.hpMax ?? '');
    setTempHp(token.tempHp ?? 0);
    setMaxBonus(token.maxHpBonus || 0);
    setShowHp(Boolean(token.showHp));
    setEffects(token.effects || []);
    setDeathSaves(deathSavesForToken(token.deathSaves, token.conditions, token.characterId));
  }, [token]);

  // Conditions and reminders are toggled, never typed, so an open menu follows
  // them live. Every save sends the whole list: a stale one would undo what
  // another screen set meanwhile.
  const liveConditions = JSON.stringify(token?.conditions || []);
  const liveEffects = JSON.stringify(token?.effects || []);
  useEffect(() => {
    if (!token || syncedIdRef.current !== token.id) return;
    setConditions(token.conditions || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveConditions]);
  useEffect(() => {
    if (!token || syncedIdRef.current !== token.id) return;
    setEffects(token.effects || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveEffects]);

  // Hit points change under an open menu too (a step from here coming back,
  // another screen). A field with a typed value still waiting keeps it.
  const liveVitals = [token?.hpCurrent, token?.hpMax, token?.tempHp, token?.maxHpBonus].join('|');
  useEffect(() => {
    if (!token || syncedIdRef.current !== token.id) return;
    const pending = pendingVitalsRef.current;
    if (!Object.hasOwn(pendingPatchRef.current, 'hpCurrent')) setHpCurrent(token.hpCurrent ?? '');
    if (!Object.hasOwn(pendingPatchRef.current, 'hpMax') && !pending.setMaxHp) {
      setHpMax(token.hpMax ?? '');
      setMaxBonus(token.maxHpBonus || 0);
    }
    if (!pending.setTempHp) setTempHp(token.tempHp ?? 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveVitals]);

  useEffect(() => () => {
    clearTimeout(typingTimerRef.current);
    clearTimeout(vitalsTimerRef.current);
  }, []);

  // Every control writes as it is used. A Save button in a menu opened by
  // right-clicking a piece mid-combat is one click too many, and forgetting it
  // loses the change silently.
  const save = useCallback((patch) => {
    if (!token) return;
    clearTimeout(typingTimerRef.current);
    patch = { ...pendingPatchRef.current, ...patch };
    pendingPatchRef.current = {};
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
      // Only fields touched by this control are a health edit. Renaming a
      // token or changing its visibility must never replay cached HP.
      healthPatch: {
        ...(Object.hasOwn(patch, 'hpCurrent') ? { currentHP: next.hpCurrent === '' ? 0 : Number(next.hpCurrent) } : {}),
        ...(Object.hasOwn(patch, 'conditions') ? { activeConditions: next.conditions } : {}),
        ...(Object.hasOwn(patch, 'effects') ? { activeEffects: next.effects } : {}),
        ...(Object.hasOwn(patch, 'deathSaves') ? { deathSaves: next.deathSaves } : {}),
      },
    });
  }, [conditions, deathSaves, effects, gmOnly, hpCurrent, hpMax, label, onSave, showHp, token]);

  // Typing is the one thing not written per keystroke: that would be a row
  // version per character, and a realtime event for each one.
  const saveSoon = useCallback((patch) => {
    clearTimeout(typingTimerRef.current);
    pendingPatchRef.current = { ...pendingPatchRef.current, ...patch };
    typingTimerRef.current = setTimeout(() => save({}), TYPING_DELAY);
  }, [save]);

  // Maximum and temporary hit points typed in: one command per field once the
  // typing stops, the last value of each.
  const flushVitals = useCallback(() => {
    clearTimeout(vitalsTimerRef.current);
    const pending = Object.values(pendingVitalsRef.current);
    pendingVitalsRef.current = {};
    if (token && onVitals) pending.forEach((command) => onVitals(token, command));
  }, [onVitals, token]);

  const vitalsSoon = useCallback((command) => {
    clearTimeout(vitalsTimerRef.current);
    pendingVitalsRef.current = { ...pendingVitalsRef.current, [command.type]: command };
    vitalsTimerRef.current = setTimeout(flushVitals, TYPING_DELAY);
  }, [flushVitals]);

  // A stepper click on the targeted field, shown at once and corrected by the
  // values that come back. A value still being typed goes first.
  const step = useCallback((delta) => {
    if (!token || !onVitals) return;
    flushVitals();
    if (Object.keys(pendingPatchRef.current).length) save({});
    const command = { type: STEP_TARGETS[stepTarget].command, delta };
    // What the GM sees is what the step applies to: a value typed a moment ago
    // may not have come back on the piece yet.
    const shown = {
      hpCurrent: hpCurrent === '' ? null : Number(hpCurrent),
      hpMax: hpMax === '' ? null : Number(hpMax),
      tempHP: Number(tempHp) || 0,
      maxHPBonus: maxBonus,
      activeConditions: conditions,
    };
    const after = applyMonsterVitalCommand(shown, command);
    setHpCurrent(after.hpCurrent ?? '');
    setHpMax(after.hpMax ?? '');
    setTempHp(after.tempHP ?? 0);
    setMaxBonus(after.maxHPBonus || 0);
    // A character at 0 HP is dying, not dead: their sheet decides.
    if (!token.characterId && after.activeConditions) setConditions(after.activeConditions);
    onVitals(token, command, shown);
  }, [conditions, flushVitals, hpCurrent, hpMax, maxBonus, onVitals, save, stepTarget, tempHp, token]);

  if (!token) return null;
  const isMapObject = Boolean(token.iconKey);
  // Read off the piece rather than kept in state: the layer is written
  // optimistically and rolled back if the database refuses, and a local copy
  // would keep showing the tick that never took.
  const hiddenFromPlayers = Boolean(token.hiddenFromPlayers) || token.layer === 'gm';


  const menuWidth = isMapObject ? 270 : 360;
  const hpFieldWidth = onVitals ? 60 : 82;

  return (
    <Menu
      open={Boolean(anchor)}
      onClose={onClose}
      {...placement.menuProps}
      container={fullscreenContainer}
      slotProps={{
        transition: placement.transitionProps,
        paper: {
          sx: {
            ...battleMapDialogPaperSx,
            width: menuWidth,
            maxWidth: 'calc(100vw - 16px)',
            // Of the visible window, not 100vh: on a phone 100vh is taller than
            // the screen while the browser bar shows, and a menu that tall gets
            // pushed up past the top edge. 32px leaves Popover's 16px margins.
            maxHeight: 'calc(100% - 32px)',
            '& .MuiMenu-list': { p: 0 },
          },
        },
      }}
    >
      <Stack spacing={0.65} sx={{ px: 1, py: 0.75 }}>
        {/* Whether the table sees the piece at all. A trap, hoard or hidden map
            prop arrives with this already ticked; clearing it is how the GM
            reveals it. Normal map/token layers stay intact, while a legacy GM
            layer row falls back to tokens. */}
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
            <Divider />
          </>
        ) : null}

        {canEdit ? (
          <>
          <TextField
            label="Label"
            size="small"
            // Not on a touch screen: focusing a field there raises the keyboard
            // and the page slides up under the finger that held the piece.
            autoFocus={!coarsePointer()}
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

          {!isMapObject ? <Divider /> : null}

          {/* The same row on every piece. A character's hit points are edited
              as health commands on their sheet, an encounter creature's on its
              fight, any other piece's in its GM-only values: never a copy on
              the piece. Without the commands a character's are not shown. */}
          {!isMapObject && (onVitals || !token.characterId) ? <>
            <Stack direction="row" spacing={0.6} sx={{ alignItems: 'center' }}>
              <TextField
                label="HP"
                size="small"
                type="number"
                value={hpCurrent}
                onChange={(event) => {
                  const value = event.target.value;
                  setHpCurrent(value);
                  // A character at 0 is dying rather than dead, and a blank
                  // sheet value would read as 0.
                  if (token.characterId) {
                    if (value !== '') saveSoon({ hpCurrent: value });
                    return;
                  }
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
                onFocus={() => setStepTarget('hp')}
                onBlur={() => save({})}
                onKeyDown={(event) => {
                  event.stopPropagation();
                  if (event.key === 'Enter') { save({}); onClose(); }
                }}
                sx={{ ...compactFieldSx, ...stepTargetSx(onVitals && stepTarget === 'hp'), width: hpFieldWidth }}
              />
              <Typography sx={slashSx}>/</Typography>
              <Box sx={maxSlotSx}>
                <TextField
                  label="Max"
                  size="small"
                  type="number"
                  value={hpMax}
                  onChange={(event) => {
                    const value = event.target.value;
                    setHpMax(value);
                    if (!onVitals) {
                      saveSoon({ hpMax: value });
                      return;
                    }
                    if (value !== '' && Number(value) >= 1) {
                      vitalsSoon({ type: 'setMaxHp', value: Math.trunc(Number(value)) });
                    }
                  }}
                  onFocus={() => setStepTarget('max')}
                  onBlur={() => (onVitals ? flushVitals() : save({}))}
                  onKeyDown={(event) => {
                    event.stopPropagation();
                    if (event.key === 'Enter') { flushVitals(); save({}); onClose(); }
                  }}
                  sx={{ ...compactFieldSx, ...stepTargetSx(onVitals && stepTarget === 'max'), width: hpFieldWidth }}
                />
                {/* A maximum above or below the base one (Aid, a curse) says
                    by how much, on the field's corner. */}
                {maxBonus ? (
                  <Box
                    component="span"
                    title={`Maximum ${maxBonus > 0 ? 'raised' : 'lowered'} by ${Math.abs(maxBonus)}`}
                    sx={{ ...maxBonusSx, color: maxBonus > 0 ? 'success.main' : 'error.main' }}
                  >
                    {maxBonus > 0 ? '+' : ''}{maxBonus}
                  </Box>
                ) : null}
              </Box>
              {onVitals ? (
                <>
                <TextField
                  label="Temp"
                  size="small"
                  type="number"
                  value={tempHp}
                  onChange={(event) => {
                    const value = event.target.value;
                    setTempHp(value);
                    if (value !== '') vitalsSoon({ type: 'setTempHp', value: Math.max(0, Math.trunc(Number(value)) || 0) });
                  }}
                  onFocus={() => setStepTarget('temp')}
                  onBlur={flushVitals}
                  onKeyDown={(event) => {
                    event.stopPropagation();
                    if (event.key === 'Enter') { flushVitals(); onClose(); }
                  }}
                  sx={{ ...compactFieldSx, ...tempFieldSx, ...stepTargetSx(stepTarget === 'temp'), width: hpFieldWidth }}
                />
                <Box sx={stepperSlotSx} onKeyDown={(event) => event.stopPropagation()}>
                  <HpStepper
                    amount={stepAmount}
                    onAmount={setStepAmount}
                    onPlus={(n) => step(n)}
                    onMinus={(n) => step(-n)}
                    plusColor="success.main"
                    minusColor="error.main"
                    plusLabel={STEP_TARGETS[stepTarget].plusLabel}
                    minusLabel={STEP_TARGETS[stepTarget].minusLabel}
                  />
                </Box>
                </>
              ) : null}
            </Stack>
            <Divider />
          </> : null}
          </>
        ) : null}

        {isMapObject ? (
          <Box sx={objectStyleSx}>
            <Typography sx={sectionTitleSx}>Object color</Typography>
            <Box
              key={`${token.id}-color`}
              component="input"
              type="color"
              aria-label="Object color"
              title="Object color"
              disabled={!canStyleObject}
              defaultValue={token.color || VTT_COLORS.gold}
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

          {/* Reminders ("Bardic Inspiration", "Guidance"): written by name above
              the piece for the whole table, as on the sheet. */}
          <Box sx={{ ...markerSectionSx, ...reminderSectionSx }}>
            <Typography sx={sectionTitleSx}>Reminders</Typography>
            <ReminderEditor
              effects={effects}
              disabled={!canSetEffects}
              onAdd={(text) => {
                const next = addReminder(effects, text);
                setEffects(next);
                save({ effects: next });
              }}
              onRemove={(id) => {
                const next = removeEffect(effects, id);
                setEffects(next);
                save({ effects: next });
              }}
            />
          </Box>
        </Box> : null}

        <Divider />

        <Stack direction="row" spacing={0.6}>
          <Button size="small" variant="outlined" onClick={onClose} sx={{ ...menuButtonSx, flex: 1 }}>Done</Button>
          {onSheet ? (
            <Button
              size="small"
              variant="outlined"
              startIcon={<ScrollText size={14} />}
              onClick={() => { onSheet(token); onClose(); }}
              sx={menuButtonSx}
            >
              Sheet
            </Button>
          ) : null}
          {onStatBlock ? (
            <Button
              size="small"
              variant="outlined"
              startIcon={<ScrollText size={14} />}
              onClick={() => { onStatBlock(token); onClose(); }}
              sx={menuButtonSx}
            >
              Stat block
            </Button>
          ) : null}
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
        {[['success', 'Success', 'gmboard.vtt.success'], ['fail', 'Failure', 'gmboard.vtt.danger']].map(([type, label, color]) => (
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
const slashSx = { color: 'text.secondary', fontSize: '0.68rem' };
const tempFieldSx = { '& .MuiInputBase-input': { color: VTT_COLORS.tempHpText } };
const stepperSlotSx = { ml: 'auto !important', display: 'flex' };
const maxSlotSx = { position: 'relative', display: 'flex' };
// On the field's top-right corner, over its outline, as the label sits on
// the top-left one.
const maxBonusSx = {
  position: 'absolute',
  top: -7,
  right: 4,
  px: 0.3,
  bgcolor: 'gmboard.vtt.surfaceSolid',
  fontSize: '0.55rem',
  fontWeight: 700,
  lineHeight: 1.2,
  pointerEvents: 'none',
};
// The field the stepper acts on keeps a gold outline after the cursor leaves.
const stepTargetSx = (active) => (active
  ? { '& .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' } }
  : {});

const STEP_TARGETS = {
  hp: { command: 'modifyHp', plusLabel: 'Heal', minusLabel: 'Damage' },
  max: { command: 'modifyMaxHp', plusLabel: 'Increase max HP', minusLabel: 'Decrease max HP' },
  temp: { command: 'modifyTempHp', plusLabel: 'Add temp HP', minusLabel: 'Remove temp HP' },
};

const objectStyleSx = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) 34px',
  alignItems: 'center',
  gap: 0.6,
  p: 0.6,
  border: '1px solid',
  borderColor: 'gmboard.vtt.goldTint',
  borderRadius: 1,
};
const objectColorInputSx = {
  width: 32,
  height: 32,
  p: '2px',
  border: '1px solid',
  borderColor: 'gmboard.vtt.goldBorderStrong',
  borderRadius: 1,
  bgcolor: 'gmboard.vtt.inset',
  cursor: 'pointer',
  '&:disabled': { cursor: 'default', opacity: 0.45 },
};

const markerGridSx = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.08fr)',
  border: '1px solid',
  borderColor: 'gmboard.vtt.goldTint',
  borderRadius: 1,
  overflow: 'hidden',
};

const deathSavePanelSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 0.8,
  px: 0.6,
  py: 0.4,
  border: '1px solid',
  borderColor: 'gmboard.vtt.goldTint',
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

const reminderSectionSx = {
  borderLeft: '1px solid',
  borderLeftColor: 'gmboard.vtt.goldTint',
};
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

const menuButtonSx = {
  minHeight: 28,
  py: 0.25,
  fontSize: '0.62rem',
};
