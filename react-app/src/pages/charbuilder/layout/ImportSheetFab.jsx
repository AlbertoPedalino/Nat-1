import { Button, Stack } from '@mui/material';
import { Upload } from 'lucide-react';
import { useRef } from 'react';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';

export default function ImportSheetFab({ onNotify, onFile, sx, buttonSx }) {
  const inputRef = useRef(null);

  return (
    <Stack
      direction="row"
      spacing={1}
      sx={[{ alignItems: 'center' }, sx]}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;

          const isJson = file.type === 'application/json' || file.name.toLowerCase().endsWith('.json');
          if (!isJson) {
            onNotify?.('error', 'Upload a Nat 1 character sheet JSON file.');
            event.target.value = '';
            return;
          }

          onFile?.(file);
          event.target.value = '';
        }}
      />
      <Button variant="outlined" size="small" startIcon={<Upload size={ICON_SIZES.md} />} onClick={() => inputRef.current?.click()} sx={buttonSx}>
        Load Sheet JSON
      </Button>
    </Stack>
  );
}
