import { useState } from 'react';
import { Box, Button, Stack, TextField } from '@mui/material';
import SheetDialog, { CancelButton, DialogSection } from '../../../shared/ui/SheetDialog.jsx';
import SelectField from '../../../shared/ui/SelectField.jsx';
import { RARITY_OPTIONS } from '../../../shared/character/inventory/itemRarity.js';
import {
  CUSTOM_ITEM_KINDS, VALUE_UNITS, customItemDraft, customItemRecord, isCustomItemDraftReady,
} from '../../../shared/character/inventory/customItem.js';

const KIND_OPTIONS = CUSTOM_ITEM_KINDS.map(({ key, label }) => ({ value: key, label }));
const RARITY_CHOICES = RARITY_OPTIONS.map(({ key, label }) => ({ value: key, label }));
const UNIT_OPTIONS = VALUE_UNITS.map(({ key, label }) => ({ value: key, label }));

// Making up an item (a gem, a potion, a bundle of silk, a trinket) or changing
// one made up before: its name and kind, its rarity, its weight and price, its
// description (shared/character/inventory/customItem.js turns the form into
// the item). `item` is the item to edit, none to create one; `onSave(record,
// qty)` gets the item and, when creating, how many. The form starts over each
// time the dialog opens.
export default function CustomItemDialog({ open, item = null, onClose, onSave }) {
  const [draft, setDraft] = useState(() => customItemDraft(item));
  const [openedFor, setOpenedFor] = useState(null);
  const opening = open ? (item || 'new') : null;
  if (opening !== openedFor) {
    setOpenedFor(opening);
    if (open) setDraft(customItemDraft(item));
  }

  const set = (key) => (value) => setDraft((current) => ({ ...current, [key]: value }));
  const typed = (key) => (event) => set(key)(event.target.value);
  const ready = isCustomItemDraftReady(draft);
  const save = () => {
    if (!ready) return;
    onSave(customItemRecord(draft, item), Math.max(1, Math.floor(Number(draft.qty) || 1)));
    onClose();
  };

  return (
    <SheetDialog
      open={open}
      onClose={onClose}
      title={item ? 'Edit item' : 'Create item'}
      maxWidth="sm"
      showClose
      actions={(
        <>
          <CancelButton onClick={onClose} />
          <Button variant="contained" disabled={!ready} onClick={save}>{item ? 'Save' : 'Add'}</Button>
        </>
      )}
    >
      <Stack spacing={2}>
        <DialogSection title="Item">
          <Stack spacing={1.25} sx={{ mt: 1 }}>
            <TextField
              size="small"
              label="Name"
              value={draft.name}
              onChange={typed('name')}
              onKeyDown={(event) => { if (event.key === 'Enter') save(); }}
              autoFocus
              fullWidth
            />
            <Box sx={rowSx}>
              <SelectField label="Kind" value={draft.kind} onChange={set('kind')} options={KIND_OPTIONS} sx={growSx} />
              <SelectField
                label="Rarity"
                value={draft.rarity}
                onChange={set('rarity')}
                emptyOption={{ label: 'None (mundane)' }}
                emptyValue="none"
                options={RARITY_CHOICES}
                sx={growSx}
              />
              {item ? null : (
                <TextField
                  size="small"
                  label="Quantity"
                  type="number"
                  value={draft.qty}
                  onChange={typed('qty')}
                  slotProps={{ htmlInput: { min: 1, step: 1 } }}
                  sx={numberSx}
                />
              )}
            </Box>
          </Stack>
        </DialogSection>

        <DialogSection title="Weight & value" hint="Weight in pounds; the price in any coin.">
          <Box sx={[rowSx, { mt: 1 }]}>
            <TextField
              size="small"
              label="Weight (lb)"
              value={draft.weight}
              onChange={typed('weight')}
              slotProps={{ htmlInput: { inputMode: 'decimal' } }}
              sx={numberSx}
            />
            <TextField
              size="small"
              label="Value"
              value={draft.value}
              onChange={typed('value')}
              slotProps={{ htmlInput: { inputMode: 'decimal' } }}
              sx={numberSx}
            />
            <SelectField label="Coin" value={draft.unit} onChange={set('unit')} options={UNIT_OPTIONS} fullWidth={false} sx={unitSx} />
          </Box>
        </DialogSection>

        <DialogSection title="Description" hint="Shown when the item is opened. A blank line starts a new paragraph.">
          <TextField
            multiline
            minRows={3}
            size="small"
            value={draft.description}
            onChange={typed('description')}
            placeholder="What it is, what it does, where it came from…"
            fullWidth
            sx={{ mt: 1 }}
          />
        </DialogSection>
      </Stack>
    </SheetDialog>
  );
}

const rowSx = { display: 'flex', flexWrap: 'wrap', gap: 1.25 };
const growSx = { flex: '1 1 160px' };
const numberSx = { flex: '0 1 120px', minWidth: 90 };
const unitSx = { flex: '0 0 auto', minWidth: 80 };
