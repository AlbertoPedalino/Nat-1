import { Box, Button, Typography } from '@mui/material';
import { SPELL_LEVEL_LABELS } from '../../../shared/character/spells/spellTables.js';
import SheetDialog, { CancelButton } from '../../../shared/ui/SheetDialog.jsx';
import CountStepper from '../../../shared/ui/CountStepper.jsx';
import { UI_COLORS, OPACITY } from '../../../shared/ui/colors.js';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { tintedSurfaceSx } from '../../../shared/ui/surfaces.js';

// A choice row of these dialogs (a slot level, an option): edged and washed in
// the accent while chosen, a fainter wash under the cursor. The wash is laid
// over the dialog's own surface, so nothing behind the dialog shows through.
function optionRowSx(selected) {
  return {
    display: 'flex', alignItems: 'center', gap: 1, border: 2,
    borderColor: selected ? UI_COLORS.accentText : UI_COLORS.edge,
    borderRadius: 1, px: 1, py: 0.75, cursor: 'pointer',
    ...(selected ? tintedSurfaceSx(UI_COLORS.accentText, { base: UI_COLORS.surfaceDeep }) : null),
    '&:hover': {
      borderColor: UI_COLORS.accentText,
      ...tintedSurfaceSx(UI_COLORS.accentText, { amount: OPACITY.wash, base: UI_COLORS.surfaceDeep }),
    },
  };
}

// The dialogs a resource side effect opens (see useResourceSideEffects): pick
// the slot to create, convert or spend, the Wild Resurgence option, the Pact
// Magic slot, or the slots an Arcane Recovery style budget restores.
export default function SlotDialogs({ dialogs, resNameMap }) {
  const {
    slotRecovery,
    setSlotRecovery,
    slotRecoverySelection,
    createSlotDialog,
    setCreateSlotDialog,
    createSlotSelection,
    setCreateSlotSelection,
    convertSlotDialog,
    setConvertSlotDialog,
    convertSlotSelection,
    setConvertSlotSelection,
    wildResurgenceDialog,
    setWildResurgenceDialog,
    spendSlotRecoverDialog,
    setSpendSlotRecoverDialog,
    spendSlotRecoverSelection,
    setSpendSlotRecoverSelection,
    consumePactSlotDialog,
    setConsumePactSlotDialog,
    confirmCreateSlot,
    confirmConvertSlot,
    confirmWildResurgence,
    confirmSpendSlotRecover,
    confirmConsumePactSlot,
    adjustSlotRecoveryLevel,
    confirmSlotRecovery,
    slotRecoverySpent,
    slotRecoveryRemaining,
  } = dialogs;
  return (
    <>
      <SheetDialog
        open={Boolean(createSlotDialog)}
        onClose={() => setCreateSlotDialog(null)}
        title={createSlotDialog?.label || 'Create Spell Slot'}
        actions={(
          <>
            <CancelButton onClick={() => setCreateSlotDialog(null)} />
            <Button variant="contained" onClick={confirmCreateSlot} disabled={createSlotSelection == null}>
              Create
            </Button>
          </>
        )}
      >
        {createSlotDialog ? (
          <Box sx={{ display: 'grid', gap: 0.75 }}>
            <Typography sx={{ fontSize: FONT_SIZES.md, color: 'text.secondary' }}>
              Choose a spell slot level to create.
            </Typography>
            {createSlotDialog.levels.map(({ level, cost }) => (
              <Box
                key={level}
                onClick={() => setCreateSlotSelection(level)}
                sx={optionRowSx(createSlotSelection === level)}
              >
                <Typography sx={{ flex: 1, fontSize: FONT_SIZES.lg, color: 'text.primary' }}>
                  Level {level}
                </Typography>
                <Typography sx={{ fontSize: FONT_SIZES.md, color: UI_COLORS.spell }}>
                  {cost} SP
                </Typography>
              </Box>
            ))}
          </Box>
        ) : null}
      </SheetDialog>

      <SheetDialog
        open={Boolean(convertSlotDialog)}
        onClose={() => setConvertSlotDialog(null)}
        title={convertSlotDialog?.label || 'Convert Spell Slot'}
        actions={(
          <>
            <CancelButton onClick={() => setConvertSlotDialog(null)} />
            <Button variant="contained" onClick={confirmConvertSlot} disabled={convertSlotSelection == null}>
              Convert
            </Button>
          </>
        )}
      >
        {convertSlotDialog ? (
          <Box sx={{ display: 'grid', gap: 0.75 }}>
            <Typography sx={{ fontSize: FONT_SIZES.md, color: 'text.secondary' }}>
              Choose an expended spell slot to convert into Sorcery Points.
            </Typography>
            {convertSlotDialog.levels.map(({ level, available, hasCreated }) => (
              <Box
                key={level}
                onClick={() => setConvertSlotSelection(level)}
                sx={optionRowSx(convertSlotSelection === level)}
              >
                <Typography sx={{ flex: 1, fontSize: FONT_SIZES.lg, color: 'text.primary' }}>
                  Level {level} ({available} available{hasCreated ? ' · includes temporary' : ''})
                </Typography>
                <Typography sx={{ fontSize: FONT_SIZES.md, color: UI_COLORS.spell }}>
                  +{level} SP
                </Typography>
              </Box>
            ))}
          </Box>
        ) : null}
      </SheetDialog>

      <SheetDialog
        open={Boolean(wildResurgenceDialog)}
        onClose={() => setWildResurgenceDialog(null)}
        title={wildResurgenceDialog?.label || 'Wild Resurgence'}
        actions={<CancelButton onClick={() => setWildResurgenceDialog(null)} />}
      >
        {wildResurgenceDialog ? (
          <Box sx={{ display: 'grid', gap: 0.75 }}>
            <Typography sx={{ fontSize: FONT_SIZES.md, color: 'text.secondary' }}>
              Choose an option (Wild Shape remaining: {wildResurgenceDialog.currentWS}).
            </Typography>
            {wildResurgenceDialog.options.map((opt) => (
              <Box
                key={opt.key}
                onClick={() => { confirmWildResurgence(opt.key); }}
                sx={optionRowSx(false)}
              >
                <Box sx={{ ...TEXT_STYLES.figure, fontSize: FONT_SIZES.md, color: UI_COLORS.accentText }}>{opt.label}</Box>
              </Box>
            ))}
          </Box>
        ) : null}
      </SheetDialog>

      <SheetDialog
        open={Boolean(spendSlotRecoverDialog)}
        onClose={() => setSpendSlotRecoverDialog(null)}
        title={spendSlotRecoverDialog?.label || 'Spell Slot Recovery'}
        actions={(
          <>
            <CancelButton onClick={() => setSpendSlotRecoverDialog(null)} />
            <Button variant="contained" onClick={confirmSpendSlotRecover} disabled={spendSlotRecoverSelection == null}>
              Spend Slot & Recover
            </Button>
          </>
        )}
      >
        {spendSlotRecoverDialog ? (
          <Box sx={{ display: 'grid', gap: 0.75 }}>
            <Typography sx={{ fontSize: FONT_SIZES.md, color: 'text.secondary' }}>
              Spend one spell slot to recover {resNameMap[spendSlotRecoverDialog.targetKey] || spendSlotRecoverDialog.targetKey}.
              {spendSlotRecoverDialog.note ? ` ${spendSlotRecoverDialog.note}` : ''}
            </Typography>
            {spendSlotRecoverDialog.levels.map(({ level, available }) => (
              <Box
                key={level}
                onClick={() => setSpendSlotRecoverSelection(level)}
                sx={optionRowSx(spendSlotRecoverSelection === level)}
              >
                <Typography sx={{ flex: 1, fontSize: FONT_SIZES.lg, color: 'text.primary' }}>
                  {SPELL_LEVEL_LABELS[level] || `Level ${level}`} · {available} available
                </Typography>
              </Box>
            ))}
          </Box>
        ) : null}
      </SheetDialog>

      <SheetDialog
        open={Boolean(consumePactSlotDialog)}
        onClose={() => setConsumePactSlotDialog(null)}
        title={consumePactSlotDialog?.label || 'Spend Pact Slot'}
        actions={(
          <>
            <CancelButton onClick={() => setConsumePactSlotDialog(null)} />
            <Button variant="contained" onClick={() => confirmConsumePactSlot(1)}>
              Spend Pact Slot
            </Button>
          </>
        )}
      >
        {consumePactSlotDialog ? (
          <Box sx={{ display: 'grid', gap: 0.75 }}>
            <Typography sx={{ fontSize: FONT_SIZES.md, color: 'text.secondary' }}>
              Expend one Pact Magic slot (level {consumePactSlotDialog.slotLevel}) to power this feature.
            </Typography>
          </Box>
        ) : null}
      </SheetDialog>

      <SheetDialog
        open={Boolean(slotRecovery)}
        onClose={() => setSlotRecovery(null)}
        title={slotRecovery?.label || 'Recover Spell Slots'}
        actions={(
          <>
            <CancelButton onClick={() => setSlotRecovery(null)} />
            <Button variant="contained" onClick={confirmSlotRecovery} disabled={!slotRecovery || slotRecoverySpent <= 0}>
              Recover
            </Button>
          </>
        )}
      >
        {slotRecovery ? (
          <Box sx={{ display: 'grid', gap: 0.75 }}>
            <Typography sx={{ fontSize: FONT_SIZES.md, color: 'text.secondary' }}>
              Recover expended spell slots. Budget {slotRecoverySpent}/{slotRecovery.budget}.
            </Typography>
            {slotRecovery.levels.map((entry) => {
              const value = Number(slotRecoverySelection[String(entry.level)] || 0);
              return (
                <Box key={entry.level} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, border: 2, borderColor: UI_COLORS.edge, borderRadius: 1, px: 0.75, py: 0.5 }}>
                  <Typography sx={{ flex: 1, fontSize: FONT_SIZES.md, color: 'text.primary' }}>
                    {SPELL_LEVEL_LABELS[entry.level] || `Level ${entry.level}`} · expended {entry.expended}
                  </Typography>
                  <CountStepper
                    value={value}
                    label={`level ${entry.level} slots`}
                    canDecrease={value > 0}
                    canIncrease={slotRecoveryRemaining >= entry.level && value < entry.expended}
                    onStep={(delta) => adjustSlotRecoveryLevel(entry.level, delta)}
                  />
                </Box>
              );
            })}
            <Typography sx={{ fontSize: FONT_SIZES.md, color: 'text.secondary' }}>
              Remaining budget: {slotRecoveryRemaining}
            </Typography>
          </Box>
        ) : null}
      </SheetDialog>
    </>
  );
}
