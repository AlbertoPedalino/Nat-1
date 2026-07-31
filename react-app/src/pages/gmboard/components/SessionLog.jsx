import { Box, Button, Stack, Typography, useTheme } from '@mui/material';
import { ScrollText, Trash2 } from 'lucide-react';
import { LOG_RENDER_LIMIT } from '../logic/constants.js';
import { useGmBoard } from '../state/GmBoardContext.jsx';

export default function SessionLog() {
  const { state, dispatch } = useGmBoard();
  const theme = useTheme();
  const entries = state.log.slice(0, LOG_RENDER_LIMIT);

  return (
    <Stack spacing={1} sx={panelSx}>
      <Box sx={headRowSx}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
          <ScrollText size={14} color={theme.palette.primary.main} />
          <Typography sx={titleSx}>Session Log</Typography>
          {entries.length ? <Typography sx={countSx}>({entries.length})</Typography> : null}
        </Box>
        <Button
          size="small"
          variant="outlined"
          color="error"
          startIcon={<Trash2 size={13} />}
          onClick={() => dispatch({ type: 'clearLog' })}
          disabled={!entries.length}
        >
          Clear
        </Button>
      </Box>
      <Box sx={logBoxSx}>
        {entries.length ? entries.map((entry, index) => (
          <Typography key={index} sx={{ ...entrySx, borderBottom: `1px solid ${theme.palette.gmboard.rowDivider}` }}>{entry}</Typography>
        )) : (
          <Typography sx={emptySx}>No log entries yet.</Typography>
        )}
      </Box>
    </Stack>
  );
}

const panelSx = {
  p: 1.5,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2,
  bgcolor: 'background.paper',
};

const headRowSx = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

const titleSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.8rem',
  letterSpacing: '0.06em',
  color: 'primary.main',
};

const countSx = {
  fontSize: '0.7rem',
  color: 'text.secondary',
};

const logBoxSx = {
  maxHeight: '260px',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 0.5,
};

const entrySx = {
  fontSize: '0.74rem',
  color: 'text.secondary',
  pb: 0.4,
};

const emptySx = {
  fontSize: '0.78rem',
  color: 'text.secondary',
  fontStyle: 'italic',
};
