import { useState } from 'react';
import { Box, Button } from '@mui/material';
import { SlidersHorizontal, X } from 'lucide-react';
import { RICH_TEXT_ACCENT } from '../../ui/entityColors.js';
import {
  ITEM_FILTER_FIELDS,
  countActiveFilterValues,
  emptyItemFilters,
  rangeFilterKeys,
} from './itemFilters.js';
import { UI_COLORS } from '../../ui/colors.js';
import { FONT_SIZES } from '../../ui/fonts.js';
import RangeInputs from '../../ui/RangeInputs.jsx';
import { TEXT_STYLES } from '../../ui/textStyles.js';
import { SURFACES } from '../../ui/surfaces.js';
import { ICON_SIZES } from '../../ui/iconSizes.js';
import SelectField from '../../ui/SelectField.jsx';
import DisclosureButton from '../../ui/DisclosureButton.jsx';

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

const ANY = 'Any';

function FilterRow({ label, children }) {
  return (
    <>
      <Box sx={labelSx}>{label}</Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>{children}</Box>
    </>
  );
}

function ChoiceSelect({ label, value, options, onChange }) {
  return (
    <SelectField
      ariaLabel={label}
      value={value || ''}
      onChange={onChange}
      emptyOption={{ label: ANY }}
      options={options.map((option) => ({ value: option, label: option }))}
    />
  );
}

function MultiChoiceSelect({ label, value, options, onChange }) {
  return (
    <SelectField
      multiple
      ariaLabel={label}
      value={value}
      onChange={onChange}
      placeholder={ANY}
      options={options.map((option) => ({ value: option, label: option }))}
    />
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
        <DisclosureButton
          open={open}
          onToggle={() => setOpen((prev) => !prev)}
          label="Filters"
          count={activeCount}
          lit={activeCount > 0}
          icon={<SlidersHorizontal size={ICON_SIZES.xs} />}
        />
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
                    label={field.label}
                    value={filters[field.key]}
                    options={fieldOptions}
                    onChange={(value) => setField(field.key, value)}
                  />
                ) : (
                  <ChoiceSelect
                    label={field.label}
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
