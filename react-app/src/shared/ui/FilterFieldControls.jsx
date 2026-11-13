import { Box, Button, Typography } from '@mui/material';
import SelectField from './SelectField.jsx';
import RangeInputs from './RangeInputs.jsx';
import { captionLabelSx } from './PanelHeader.jsx';
import { ONE_LINE_SX } from './textStyles.js';
import {
  YES_NO_OPTIONS, anyValue, fieldOptions, isSingleChoice, rangeFilterKeys,
} from '../content/filterFields.js';

// The controls of a list's filters (shared/content/filterFields.js), one look
// wherever a list is filtered (the compendium's catalogs, the bestiary
// browser, the item lists): a drop-down per select or yes/no field — several
// choices at once unless the field is `single` — then `extra` one-choice
// drop-downs of the list's own ({ key, label, options: [{ key, label }] }: a
// sort), then a min–max per range field, wrapping as the width allows.
//
// A field's options come from `options[field.key]` when the list worked them
// out already (the item lists, from their pool), else from the field itself
// (with `entries`); a drop-down with nothing to offer is left out.
// `onReset` shows "Reset filters" while `changed`.
export default function FilterFieldControls({
  fields, filters, onChange, entries = [], options = null, extra = [], changed = false, onReset,
}) {
  const choices = fields.filter((field) => field.kind !== 'range').map((field) => ({
    key: field.key,
    label: field.label,
    multiple: !isSingleChoice(field),
    any: anyValue(field),
    options: field.kind === 'yesNo' ? YES_NO_OPTIONS : (options?.[field.key] ?? fieldOptions(field, entries)),
  })).filter((control) => control.options.length);
  const ranges = fields.filter((field) => field.kind === 'range');
  return (
    <Box sx={controlsSx}>
      {[...choices, ...extra].map((control) => {
        const items = control.options.map((option) => ({ value: option.key, label: option.label }));
        return control.multiple ? (
          <SelectField
            key={control.key}
            multiple
            label={control.label}
            value={filters[control.key]}
            onChange={(value) => onChange(control.key, value)}
            placeholder="Any"
            options={items}
            fullWidth={false}
            sx={controlSx}
          />
        ) : (
          <SelectField
            key={control.key}
            label={control.label}
            value={filters[control.key] || control.any || ''}
            onChange={(value) => onChange(control.key, value)}
            emptyOption={control.any ? { label: 'Any' } : undefined}
            emptyValue={control.any || undefined}
            options={items}
            fullWidth={false}
            sx={controlSx}
          />
        );
      })}
      {ranges.map((field) => {
        const [minKey, maxKey] = rangeFilterKeys(field);
        return (
          <Box key={field.key} role="group" aria-label={field.label} sx={rangeSx}>
            <Typography component="span" sx={captionLabelSx}>{field.label}</Typography>
            <RangeInputs
              label={field.label}
              unit={field.unit}
              step={field.step}
              min={filters[minKey]}
              max={filters[maxKey]}
              onMin={(value) => onChange(minKey, value)}
              onMax={(value) => onChange(maxKey, value)}
            />
          </Box>
        );
      })}
      {changed && onReset ? (
        <Button size="small" onClick={onReset}>Reset filters</Button>
      ) : null}
    </Box>
  );
}

const controlsSx = { display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' };

// A drop-down wide enough for its label, never wider than a column: several
// chosen values are listed in it, cut with an ellipsis.
const controlSx = {
  minWidth: 130,
  maxWidth: 260,
  flex: { xs: '1 1 130px', md: '0 0 auto' },
  '& .MuiSelect-select': ONE_LINE_SX,
};

const rangeSx = { display: 'flex', alignItems: 'center', gap: 0.75 };
