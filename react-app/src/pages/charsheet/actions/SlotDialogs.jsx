import { Box, Button, Typography } from '@mui/material';
import { SPELL_LEVEL_LABELS } from '../../charbuilder/constants.js';
import SheetDialog from '../../../shared/ui/SheetDialog.jsx';

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
            <Button onClick={() => setCreateSlotDialog(null)} sx={{ color: 'text.secondary' }}>Cancel</Button>
            <Button variant="contained" onClick={confirmCreateSlot} disabled={createSlotSelection == null}>
              Create
            </Button>
          </>
        )}
      >
        {createSlotDialog ? (
          <Box sx={{ display: 'grid', gap: 0.75 }}>
            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
              Choose a spell slot level to create.
            </Typography>
            {createSlotDialog.levels.map(({ level, cost }) => (
              <Box
                key={level}
                onClick={() => setCreateSlotSelection(level)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1, border: 1,
                  borderColor: createSlotSelection === level ? '#edd48a' : 'divider',
                  borderRadius: 1, px: 1, py: 0.8, cursor: 'pointer',
                  bgcolor: createSlotSelection === level ? 'rgba(237,212,138,0.1)' : 'transparent',
                  '&:hover': { borderColor: '#edd48a', bgcolor: 'rgba(237,212,138,0.06)' },
                }}
              >
                <Typography sx={{ flex: 1, fontSize: '0.78rem', color: 'text.primary' }}>
                  Level {level}
                </Typography>
                <Typography sx={{ fontSize: '0.7rem', color: '#9d7fb8' }}>
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
            <Button onClick={() => setConvertSlotDialog(null)} sx={{ color: 'text.secondary' }}>Cancel</Button>
            <Button variant="contained" onClick={confirmConvertSlot} disabled={convertSlotSelection == null}>
              Convert
            </Button>
          </>
        )}
      >
        {convertSlotDialog ? (
          <Box sx={{ display: 'grid', gap: 0.75 }}>
            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
              Choose an expended spell slot to convert into Sorcery Points.
            </Typography>
            {convertSlotDialog.levels.map(({ level, available, hasCreated }) => (
              <Box
                key={level}
                onClick={() => setConvertSlotSelection(level)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1, border: 1,
                  borderColor: convertSlotSelection === level ? '#edd48a' : 'divider',
                  borderRadius: 1, px: 1, py: 0.8, cursor: 'pointer',
                  bgcolor: convertSlotSelection === level ? 'rgba(237,212,138,0.1)' : 'transparent',
                  '&:hover': { borderColor: '#edd48a', bgcolor: 'rgba(237,212,138,0.06)' },
                }}
              >
                <Typography sx={{ flex: 1, fontSize: '0.78rem', color: 'text.primary' }}>
                  Level {level} ({available} available{hasCreated ? ' · includes temporary' : ''})
                </Typography>
                <Typography sx={{ fontSize: '0.7rem', color: '#9d7fb8' }}>
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
        actions={<Button onClick={() => setWildResurgenceDialog(null)} sx={{ color: 'text.secondary' }}>Cancel</Button>}
      >
        {wildResurgenceDialog ? (
          <Box sx={{ display: 'grid', gap: 0.75 }}>
            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
              Choose an option (Wild Shape remaining: {wildResurgenceDialog.currentWS}).
            </Typography>
            {wildResurgenceDialog.options.map((opt) => (
              <Box
                key={opt.key}
                onClick={() => { confirmWildResurgence(opt.key); }}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1, border: 1,
                  borderColor: 'divider', borderRadius: 1, px: 1, py: 0.8, cursor: 'pointer',
                  '&:hover': { borderColor: '#edd48a', bgcolor: 'rgba(237,212,138,0.06)' },
                }}
              >
                <Box sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.72rem', color: '#edd48a' }}>{opt.label}</Box>
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
            <Button onClick={() => setSpendSlotRecoverDialog(null)} sx={{ color: 'text.secondary' }}>Cancel</Button>
            <Button variant="contained" onClick={confirmSpendSlotRecover} disabled={spendSlotRecoverSelection == null}>
              Spend Slot & Recover
            </Button>
          </>
        )}
      >
        {spendSlotRecoverDialog ? (
          <Box sx={{ display: 'grid', gap: 0.75 }}>
            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
              Spend one spell slot to recover {resNameMap[spendSlotRecoverDialog.targetKey] || spendSlotRecoverDialog.targetKey}.
              {spendSlotRecoverDialog.note ? ` ${spendSlotRecoverDialog.note}` : ''}
            </Typography>
            {spendSlotRecoverDialog.levels.map(({ level, available }) => (
              <Box
                key={level}
                onClick={() => setSpendSlotRecoverSelection(level)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1, border: 1,
                  borderColor: spendSlotRecoverSelection === level ? '#edd48a' : 'divider',
                  borderRadius: 1, px: 1, py: 0.8, cursor: 'pointer',
                  bgcolor: spendSlotRecoverSelection === level ? 'rgba(237,212,138,0.1)' : 'transparent',
                  '&:hover': { borderColor: '#edd48a', bgcolor: 'rgba(237,212,138,0.06)' },
                }}
              >
                <Typography sx={{ flex: 1, fontSize: '0.78rem', color: 'text.primary' }}>
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
            <Button onClick={() => setConsumePactSlotDialog(null)} sx={{ color: 'text.secondary' }}>Cancel</Button>
            <Button variant="contained" onClick={() => confirmConsumePactSlot(1)}>
              Spend Pact Slot
            </Button>
          </>
        )}
      >
        {consumePactSlotDialog ? (
          <Box sx={{ display: 'grid', gap: 0.75 }}>
            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
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
            <Button onClick={() => setSlotRecovery(null)} sx={{ color: 'text.secondary' }}>Cancel</Button>
            <Button variant="contained" onClick={confirmSlotRecovery} disabled={!slotRecovery || slotRecoverySpent <= 0}>
              Recover
            </Button>
          </>
        )}
      >
        {slotRecovery ? (
          <Box sx={{ display: 'grid', gap: 0.75 }}>
            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
              Recover expended spell slots. Budget {slotRecoverySpent}/{slotRecovery.budget}.
            </Typography>
            {slotRecovery.levels.map((entry) => {
              const value = Number(slotRecoverySelection[String(entry.level)] || 0);
              return (
                <Box key={entry.level} sx={{ display: 'flex', alignItems: 'center', gap: 0.6, border: 1, borderColor: 'divider', borderRadius: 1, px: 0.8, py: 0.6 }}>
                  <Typography sx={{ flex: 1, fontSize: '0.72rem', color: 'text.primary' }}>
                    {SPELL_LEVEL_LABELS[entry.level] || `Level ${entry.level}`} · expended {entry.expended}
                  </Typography>
                  <Button size="small" variant="outlined" onClick={() => adjustSlotRecoveryLevel(entry.level, -1)} sx={{ minWidth: 26, px: 0.7 }}>-</Button>
                  <Typography sx={{ minWidth: 16, textAlign: 'center', fontSize: '0.78rem', color: '#edd48a', fontFamily: '"Cinzel", Georgia, serif' }}>{value}</Typography>
                  <Button size="small" variant="outlined" onClick={() => adjustSlotRecoveryLevel(entry.level, 1)} disabled={slotRecoveryRemaining < entry.level || value >= entry.expended} sx={{ minWidth: 26, px: 0.7 }}>+</Button>
                </Box>
              );
            })}
            <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
              Remaining budget: {slotRecoveryRemaining}
            </Typography>
          </Box>
        ) : null}
      </SheetDialog>
    </>
  );
}
