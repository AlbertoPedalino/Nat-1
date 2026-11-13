import { useState } from 'react';
import { Box, Button } from '@mui/material';
import { SlidersHorizontal, X } from 'lucide-react';
import { ITEM_FILTER_FIELDS, countActiveFilterValues, emptyItemFilters } from './itemFilters.js';
import { UI_COLORS } from '../../ui/colors.js';
import { FONT_SIZES } from '../../ui/fonts.js';
import { TEXT_STYLES } from '../../ui/textStyles.js';
import { SURFACES } from '../../ui/surfaces.js';
import { ICON_SIZES } from '../../ui/iconSizes.js';
import DisclosureButton from '../../ui/DisclosureButton.jsx';
import FilterFieldControls from '../../ui/FilterFieldControls.jsx';

// Collapsible advanced-filter panel for item lists (inventory + add-item
// search): the app's filter controls (FilterFieldControls) for
// ITEM_FILTER_FIELDS, so this file never needs touching to add a filter.
// Drop-down options come from the caller, derived from the pool being filtered
// (buildItemFilterOptions), so a choice can never yield zero results; a
// drop-down the pool offers nothing for is left out (a wizard's inventory
// shows no Damage or Mastery).

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

const wellSx = { ...SURFACES.inset, mt: 0.5, p: 1 };

export default function ItemFilterPanel({ filters, onChange, options, sx }) {
  const [open, setOpen] = useState(false);
  const activeCount = countActiveFilterValues(filters);

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
        <Box sx={wellSx}>
          <FilterFieldControls
            fields={ITEM_FILTER_FIELDS}
            filters={filters}
            options={options || {}}
            onChange={(key, value) => onChange({ ...filters, [key]: value })}
          />
        </Box>
      ) : null}
    </Box>
  );
}
