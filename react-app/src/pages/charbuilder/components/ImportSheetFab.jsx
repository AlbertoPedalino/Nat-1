import { Button, Stack, Typography } from '@mui/material';
import { Upload } from 'lucide-react';
import { useRef } from 'react';

export default function ImportSheetFab({ message, onMessage, onFile, sx, buttonSx }) {
  const inputRef = useRef(null);

  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      sx={sx}
    >
      {message ? (
        <Typography
          variant="caption"
          sx={{ px: 1, py: 0.5, borderRadius: 1, bgcolor: 'rgba(12,16,26,.78)', maxWidth: { xs: 160, sm: 260 }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {message}
        </Typography>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) {
            onMessage('');
            return;
          }

          const isJson = file.type === 'application/json' || file.name.toLowerCase().endsWith('.json');
          if (!isJson) {
            onMessage('Carica un file JSON scheda GM-Board.');
            event.target.value = '';
            return;
          }

          onFile?.(file);
          event.target.value = '';
        }}
      />
      <Button variant="outlined" size="small" startIcon={<Upload size={16} />} onClick={() => inputRef.current?.click()} sx={buttonSx}>
        Load Sheet JSON
      </Button>
    </Stack>
  );
}
