import { Cloud } from 'lucide-react';
import { Box, MenuItem, TextField } from '@mui/material';
import { cloudBadgeSx, instanceNameSx, instanceRowSx } from './encounterImportStyles.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';

// The Encounter Builder save to import from; one only in the cloud is badged.
export default function EncounterSaveSelect({
  instances, value, onPick, fetching,
}) {
  return (
    <TextField
      select
      size="small"
      label="Encounter builder"
      value={value}
      onChange={(event) => onPick(event.target.value)}
      helperText={fetching ? 'Downloading from the cloud…' : null}
    >
      {instances.map((instance) => (
        <MenuItem key={instance.id} value={instance.id}>
          <Box component="span" sx={instanceRowSx}>
            <Box component="span" sx={instanceNameSx}>{instance.name || instance.id}</Box>
            {instance.hasLocal ? null : (
              <Box component="span" sx={cloudBadgeSx}>
                <Cloud size={ICON_SIZES.xs} aria-hidden />
                Cloud
              </Box>
            )}
          </Box>
        </MenuItem>
      ))}
    </TextField>
  );
}
