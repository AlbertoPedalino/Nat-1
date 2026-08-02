import { Box, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { Radio } from 'lucide-react';

// What a player sees when there is no map on the table. They never get a scene
// list: the GM decides what is up, and this screen waits for it.
export default function SessionGate({ loading }) {
  return (
    <Paper sx={paperSx}>
      <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
        {loading ? <CircularProgress size={26} /> : <Box sx={iconSx}><Radio size={28} /></Box>}
        <Typography variant="h2">
          {loading ? 'Looking for the table…' : 'No map on the table'}
        </Typography>
        <Typography color="text.secondary" sx={{ maxWidth: 420 }}>
          {loading
            ? null
            : 'Your GM has not put a map up yet. This page will open it by itself as soon as they do.'}
        </Typography>
      </Stack>
    </Paper>
  );
}

const paperSx = {
  p: 5,
  bgcolor: 'background.paper',
  textAlign: 'center',
};

const iconSx = {
  color: 'text.secondary',
  display: 'flex',
};
