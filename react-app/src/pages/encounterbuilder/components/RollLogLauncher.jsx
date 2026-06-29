import { useState } from 'react';
import { Box, Button } from '@mui/material';
import { ScrollText } from 'lucide-react';
import { useEncounterBuilder } from '../state/EncounterBuilderContext.jsx';
import RollLog from './RollLog.jsx';

export default function RollLogLauncher() {
  const { state } = useEncounterBuilder();
  const [open, setOpen] = useState(false);
  const count = state.rollLog.length;

  return (
    <>
      <Button
        variant="contained"
        startIcon={<ScrollText size={16} />}
        onClick={() => setOpen((value) => !value)}
        sx={buttonSx}
      >
        Roll Log{count ? ` (${count})` : ''}
      </Button>
      {open ? (
        <Box sx={popupSx}>
          <RollLog
            onClose={() => setOpen(false)}
            maxHeight="min(430px, calc(100vh - 170px))"
            sx={{ boxShadow: '0 14px 40px rgba(0,0,0,0.55)' }}
          />
        </Box>
      ) : null}
    </>
  );
}

const buttonSx = {
  position: 'fixed',
  left: { xs: 12, sm: 18 },
  bottom: { xs: 12, sm: 18 },
  zIndex: 1250,
  boxShadow: '0 8px 26px rgba(0,0,0,0.45)',
};

const popupSx = {
  position: 'fixed',
  left: { xs: 12, sm: 18 },
  bottom: { xs: 62, sm: 72 },
  width: { xs: 'calc(100vw - 24px)', sm: 380 },
  maxWidth: 'calc(100vw - 24px)',
  zIndex: 1250,
};
