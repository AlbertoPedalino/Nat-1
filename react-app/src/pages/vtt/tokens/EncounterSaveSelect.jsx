import { Cloud } from 'lucide-react';
import { Box } from '@mui/material';
import { cloudBadgeSx, instanceNameSx, instanceRowSx } from './encounterImportStyles.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import SelectField from '../../../shared/ui/SelectField.jsx';

// The Encounter Builder save to import from; one only in the cloud is badged.
export default function EncounterSaveSelect({
  instances, value, onPick, fetching,
}) {
  return (
    <SelectField
      label="Encounter builder"
      value={value}
      onChange={onPick}
      helperText={fetching ? 'Downloading from the cloud…' : null}
      options={instances.map((instance) => ({
        value: instance.id,
        label: (
          <Box component="span" sx={instanceRowSx}>
            <Box component="span" sx={instanceNameSx}>{instance.name || instance.id}</Box>
            {instance.hasLocal ? null : (
              <Box component="span" sx={cloudBadgeSx}>
                <Cloud size={ICON_SIZES.xs} aria-hidden />
                Cloud
              </Box>
            )}
          </Box>
        ),
      }))}
    />
  );
}
