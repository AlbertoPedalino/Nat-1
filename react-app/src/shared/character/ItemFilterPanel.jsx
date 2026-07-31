import { useState } from 'react';
import { Box, Button, MenuItem, Select, TextField } from '@mui/material';
import { ChevronDown, ChevronRight, SlidersHorizontal, X } from 'lucide-react';
import { RICH_TEXT_ACCENT } from '../entityColors.js';
import {
  ITEM_FILTER_FIELDS,
  countActiveFilterValues,
  emptyItemFilters,
  rangeFilterKeys,
} from './itemFilters.js';

// Collapsible advanced-filter panel for item lists (inventory + add-item
// search). Rows are generated from ITEM_FILTER_FIELDS, so this file never needs
// touching to add a filter. Dropdown options come from the caller, derived from
// the pool being filtered, so a choice can never yield zero results.
//
// A dropdown row hides itself when the pool offers no values for it — a wizard's
// inventory shows no Damage or Mastery row. Ranges always show: "no item weighs
// anything" is not a case worth special-casing.

const toggleSx = (open, active) => ({
  minHeight: 0,
  px: '12px',
  py: '4px',
  border: 1,
  borderColor: open || active ? '#caa550' : 'divider',
  borderRadius: 1,
  bgcolor: open || active ? 'rgba(202,165,80,0.14)' : 'rgba(35,32,26,1)',
  color: open || active ? '#edd48a' : 'text.secondary',
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.6rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
  '&:hover': { borderColor: '#caa550', color: '#edd48a' },
});

const clearButtonSx = {
  minHeight: 0,
  px: '8px',
  py: '3px',
  borderRadius: 1,
  color: 'text.secondary',
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.58rem',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  '&:hover': { color: '#de675f' },
};

const labelSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: RICH_TEXT_ACCENT,
  fontSize: '0.55rem',
  alignSelf: 'center',
  whiteSpace: 'nowrap',
};

const controlSx = {
  width: '100%',
  fontSize: '0.72rem',
  bgcolor: 'rgba(35,32,26,1)',
  borderRadius: 1,
  '& .MuiSelect-select': { py: '5px' },
};

const numberFieldSx = {
  width: 72,
  '& .MuiOutlinedInput-root': { bgcolor: 'rgba(35,32,26,1)', borderRadius: 1 },
  '& input': { fontSize: '0.72rem', py: '6px' },
};

const gridSx = {
  display: 'grid',
  gridTemplateColumns: 'auto minmax(0, 1fr)',
  columnGap: '8px',
  rowGap: '6px',
  alignItems: 'center',
  mt: 0.6,
  p: '8px',
  border: 1,
  borderColor: 'divider',
  borderRadius: 1,
  bgcolor: 'rgba(18,16,14,0.65)',
};

const unitSx = { fontSize: '0.6rem', color: 'text.secondary' };
const placeholderSx = { color: 'text.secondary', opacity: 0.75 };
const menuProps = { PaperProps: { sx: { maxHeight: 320 } } };
const menuItemSx = { fontSize: '0.75rem' };

const ANY = 'Any';

function Placeholder() {
  return <Box component="span" sx={placeholderSx}>{ANY}</Box>;
}

function FilterRow({ label, children }) {
  return (
    <>
      <Box sx={labelSx}>{label}</Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>{children}</Box>
    </>
  );
}

function ChoiceSelect({ value, options, onChange }) {
  return (
    <Select
      size="small"
      displayEmpty
      value={value || ''}
      onChange={(event) => onChange(event.target.value)}
      MenuProps={menuProps}
      sx={controlSx}
      renderValue={(selected) => (selected || <Placeholder />)}
    >
      <MenuItem value=""><Placeholder /></MenuItem>
      {options.map((option) => (
        <MenuItem key={option} value={option} sx={menuItemSx}>{option}</MenuItem>
      ))}
    </Select>
  );
}

function SelectedChips({ values }) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
      {values.map((value) => (
        <Box
          key={value}
          component="span"
          sx={{
            px: '5px',
            border: 1,
            borderColor: 'rgba(202,165,80,0.45)',
            borderRadius: '3px',
            bgcolor: 'rgba(202,165,80,0.12)',
            color: '#edd48a',
            fontSize: '0.6rem',
          }}
        >
          {value}
        </Box>
      ))}
    </Box>
  );
}

function MultiChoiceSelect({ value, options, onChange }) {
  const selected = Array.isArray(value) ? value : [];
  return (
    <Select
      size="small"
      multiple
      displayEmpty
      value={selected}
      onChange={(event) => {
        const next = event.target.value;
        onChange(typeof next === 'string' ? next.split(',') : next);
      }}
      MenuProps={menuProps}
      sx={controlSx}
      renderValue={(picked) => (picked.length ? <SelectedChips values={picked} /> : <Placeholder />)}
    >
      {options.map((option) => (
        <MenuItem key={option} value={option} sx={menuItemSx}>{option}</MenuItem>
      ))}
    </Select>
  );
}

function RangeInputs({ field, filters, onField }) {
  const [minKey, maxKey] = rangeFilterKeys(field);
  return (
    <>
      <TextField
        size="small"
        type="number"
        placeholder="min"
        value={filters[minKey] ?? ''}
        onChange={(event) => onField(minKey, event.target.value)}
        slotProps={{ htmlInput: { min: 0, step: field.step, 'aria-label': `${field.label} minimum` } }}
        sx={numberFieldSx}
      />
      <Box component="span" sx={unitSx}>–</Box>
      <TextField
        size="small"
        type="number"
        placeholder="max"
        value={filters[maxKey] ?? ''}
        onChange={(event) => onField(maxKey, event.target.value)}
        slotProps={{ htmlInput: { min: 0, step: field.step, 'aria-label': `${field.label} maximum` } }}
        sx={numberFieldSx}
      />
      <Box component="span" sx={unitSx}>{field.unit}</Box>
    </>
  );
}

export default function ItemFilterPanel({ filters, onChange, options, sx }) {
  const [open, setOpen] = useState(false);
  const activeCount = countActiveFilterValues(filters);
  const opts = options || {};

  const setField = (key, value) => onChange({ ...filters, [key]: value });

  return (
    <Box sx={sx}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        <Button
          size="small"
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
          startIcon={<SlidersHorizontal size={12} />}
          endIcon={open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          sx={toggleSx(open, activeCount > 0)}
        >
          {activeCount > 0 ? `Filters (${activeCount})` : 'Filters'}
        </Button>
        {activeCount > 0 ? (
          <Button size="small" onClick={() => onChange(emptyItemFilters())} startIcon={<X size={11} />} sx={clearButtonSx}>
            Clear all
          </Button>
        ) : null}
      </Box>

      {open ? (
        <Box sx={gridSx}>
          {ITEM_FILTER_FIELDS.map((field) => {
            if (field.kind === 'range') {
              return (
                <FilterRow key={field.key} label={field.label}>
                  <RangeInputs field={field} filters={filters} onField={setField} />
                </FilterRow>
              );
            }

            const fieldOptions = opts[field.key] || [];
            if (!fieldOptions.length) return null;

            return (
              <FilterRow key={field.key} label={field.label}>
                {field.kind === 'multiSelect' ? (
                  <MultiChoiceSelect
                    value={filters[field.key]}
                    options={fieldOptions}
                    onChange={(value) => setField(field.key, value)}
                  />
                ) : (
                  <ChoiceSelect
                    value={filters[field.key]}
                    options={fieldOptions}
                    onChange={(value) => setField(field.key, value)}
                  />
                )}
              </FilterRow>
            );
          })}
        </Box>
      ) : null}
    </Box>
  );
}
