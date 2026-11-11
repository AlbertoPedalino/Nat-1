import { useState } from 'react';
import { Box, Button, MenuItem, Select } from '@mui/material';
import { ChevronDown, ChevronRight, SlidersHorizontal, X } from 'lucide-react';
import { RICH_TEXT_ACCENT } from '../../ui/entityColors.js';
import {
  ITEM_FILTER_FIELDS,
  countActiveFilterValues,
  emptyItemFilters,
  rangeFilterKeys,
} from './itemFilters.js';
import { UI_COLORS, uiAlpha, OPACITY } from '../../ui/colors.js';
import { FONT_SIZES } from '../../ui/fonts.js';
import { goldToggleSx } from '../../ui/actionButton.js';
import RangeInputs from '../../ui/RangeInputs.jsx';
import { TEXT_STYLES } from '../../ui/textStyles.js';
import { SURFACES } from '../../ui/surfaces.js';
import { ICON_SIZES } from '../../ui/iconSizes.js';

// Collapsible advanced-filter panel for item lists (inventory + add-item
// search). Rows are generated from ITEM_FILTER_FIELDS, so this file never needs
// touching to add a filter. Dropdown options come from the caller, derived from
// the pool being filtered, so a choice can never yield zero results.
//
// A dropdown row hides itself when the pool offers no values for it — a wizard's
// inventory shows no Damage or Mastery row. Ranges always show: "no item weighs
// anything" is not a case worth special-casing.

const clearButtonSx = {
  minHeight: 0,
  px: 1,
  py: 0.5,
  borderRadius: 1,
  color: 'text.secondary',
  ...TEXT_STYLES.label,
  fontSize: FONT_SIZES.xxs,
  '&:hover': { color: UI_COLORS.danger },
};

const labelSx = {
  ...TEXT_STYLES.label,
  color: RICH_TEXT_ACCENT,
  fontSize: FONT_SIZES.xxs,
  alignSelf: 'center',
  whiteSpace: 'nowrap',
};

const controlSx = {
  width: '100%',
  fontSize: FONT_SIZES.md,
  bgcolor: UI_COLORS.surfaceHeader,
  borderRadius: 1,
  '& .MuiSelect-select': { py: 0.75 },
};


const gridSx = {
  ...SURFACES.inset,
  display: 'grid',
  gridTemplateColumns: 'auto minmax(0, 1fr)',
  columnGap: 1,
  rowGap: 0.75,
  alignItems: 'center',
  mt: 0.5,
  p: 1,
};

const placeholderSx = { color: 'text.secondary', opacity: OPACITY.heavy };
const menuProps = { PaperProps: { sx: { maxHeight: 320 } } };
const menuItemSx = { fontSize: FONT_SIZES.lg };

const ANY = 'Any';

function Placeholder() {
  return <Box component="span" sx={placeholderSx}>{ANY}</Box>;
}

function FilterRow({ label, children }) {
  return (
    <>
      <Box sx={labelSx}>{label}</Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>{children}</Box>
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
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
      {values.map((value) => (
        <Box
          key={value}
          component="span"
          sx={{
            px: 0.75,
            border: 2,
            borderColor: uiAlpha(UI_COLORS.accent, OPACITY.edge),
            borderRadius: 0.375,
            bgcolor: uiAlpha(UI_COLORS.accent, OPACITY.tint),
            color: UI_COLORS.accentText,
            fontSize: FONT_SIZES.xs,
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

function RangeField({ field, filters, onField }) {
  const [minKey, maxKey] = rangeFilterKeys(field);
  return (
    <RangeInputs
      label={field.label}
      unit={field.unit}
      step={field.step}
      min={filters[minKey]}
      max={filters[maxKey]}
      onMin={(value) => onField(minKey, value)}
      onMax={(value) => onField(maxKey, value)}
    />
  );
}

export default function ItemFilterPanel({ filters, onChange, options, sx }) {
  const [open, setOpen] = useState(false);
  const activeCount = countActiveFilterValues(filters);
  const opts = options || {};

  const setField = (key, value) => onChange({ ...filters, [key]: value });

  return (
    <Box sx={sx}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
        <Button
          size="small"
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
          startIcon={<SlidersHorizontal size={ICON_SIZES.xs} />}
          endIcon={open ? <ChevronDown size={ICON_SIZES.xs} /> : <ChevronRight size={ICON_SIZES.xs} />}
          sx={goldToggleSx(open || activeCount > 0)}
        >
          {activeCount > 0 ? `Filters (${activeCount})` : 'Filters'}
        </Button>
        {activeCount > 0 ? (
          <Button size="small" onClick={() => onChange(emptyItemFilters())} startIcon={<X size={ICON_SIZES.xxs} />} sx={clearButtonSx}>
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
                  <RangeField field={field} filters={filters} onField={setField} />
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
