import { Box, Button, Typography, useTheme } from '@mui/material';
import { ScrollText, Trash2 } from 'lucide-react';
import { LOG_RENDER_LIMIT } from '../state/constants.js';
import { useGmBoard } from '../state/GmBoardContext.jsx';
import BoardPanel from '../ui/BoardPanel.jsx';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';

export default function SessionLog() {
  const { state, dispatch } = useGmBoard();
  const theme = useTheme();
  const entries = state.log.slice(0, LOG_RENDER_LIMIT);

  return (
    <BoardPanel
      icon={ScrollText}
      title="Session Log"
      titleAdornment={entries.length ? <Typography sx={countSx}>({entries.length})</Typography> : null}
      spacing={1}
      actions={(
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
      )}
    >
      <Box sx={logBoxSx}>
        {entries.length ? entries.map((entry, index) => (
          <Typography key={index} sx={{ ...entrySx, borderBottom: `1px solid ${theme.palette.gmboard.rowDivider}` }}>{entry}</Typography>
        )) : (
          <Typography sx={emptySx}>No log entries yet.</Typography>
        )}
      </Box>
    </BoardPanel>
  );
}

const countSx = {
  fontSize: FONT_SIZES.md,
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
  fontSize: FONT_SIZES.md,
  color: 'text.secondary',
  pb: 0.4,
};

const emptySx = {
  fontSize: FONT_SIZES.lg,
  color: 'text.secondary',
  fontStyle: 'italic',
};
