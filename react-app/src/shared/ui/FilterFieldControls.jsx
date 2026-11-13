import { Box, Button, Typography } from '@mui/material';
import SelectField from './SelectField.jsx';
import RangeInputs from './RangeInputs.jsx';
import { captionLabelSx } from './PanelHeader.jsx';
import { rangeFilterKeys } from '../character/inventory/itemFilters.js';
import { YES_NO_OPTIONS, anyValue, fieldOptions } from '../content/filterFields.js';

// The controls of a list's filters (shared/content/filterFields.js), one look
// wherever a list is filtered by them (the compendium's catalogs, the bestiary
// browser): a select per select or yes/no field, then `extra` selects of the
// list's own ({ key, label, any?, options: [{ key, label }] }: a source, a
// sort), then a min–max per range field, wrapping as the width allows.
// `entries` feed the options a field computes; `onReset` shows "Reset
// filters" while `changed`.
export default function FilterFieldControls({
  fields, filters, onChange, entries = [], extra = [], changed = false, onReset,
}) {
  const selects = [
    ...fields.filter((field) => field.kind !== 'range').map((field) => ({
      key: field.key,
      label: field.label,
      any: anyValue(field),
      options: field.kind === 'yesNo' ? YES_NO_OPTIONS : fieldOptions(field, entries),
    })),
    ...extra,
  ];
  const ranges = fields.filter((field) => field.kind === 'range');
  return (
    <Box sx={controlsSx}>
      {selects.map((control) => (
        <SelectField
          key={control.key}
          label={control.label}
          value={filters[control.key] || control.any || ''}
          onChange={(value) => onChange(control.key, value)}
          emptyOption={control.any ? { label: 'Any' } : undefined}
          emptyValue={control.any || undefined}
          options={control.options.map((option) => ({ value: option.key, label: option.label }))}
          fullWidth={false}
          sx={controlSx}
        />
      ))}
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

const controlSx = { minWidth: 130, flex: { xs: '1 1 130px', md: '0 0 auto' } };

const rangeSx = { display: 'flex', alignItems: 'center', gap: 0.75 };
