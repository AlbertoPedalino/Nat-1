import { useEffect, useRef, useState } from 'react';
import { Box, Button, Stack, TextField, Typography, useTheme } from '@mui/material';
import { Castle, Dices, Trash2 } from 'lucide-react';
import SelectorGroup from './SelectorGroup.jsx';
import TierSelector from './TierSelector.jsx';
import RoomCard from './RoomCard.jsx';
import { SELECTOR_CONTRACTS } from '../logic/selectorContracts.js';
import { confirmDiscard } from '../logic/confirmDiscard.js';
import { isValidRoomCount, roomCountInputFrom } from '../logic/dungeon.js';
import { useGmBoard } from '../state/GmBoardContext.jsx';

export default function DungeonView() {
  const { state, dispatch, generateDungeon } = useGmBoard();
  const theme = useTheme();
  const [roomCountInput, setRoomCountInput] = useState(() => roomCountInputFrom(state.results));
  const [error, setError] = useState('');
  const syncedDungeonIdRef = useRef(state.results.dungeon?.id ?? null);
  const dPopContract = SELECTOR_CONTRACTS.dPop;

  useEffect(() => {
    const dungeonId = state.results.dungeon?.id ?? null;
    if (dungeonId !== syncedDungeonIdRef.current) {
      syncedDungeonIdRef.current = dungeonId;
      setRoomCountInput(roomCountInputFrom(state.results));
    }
  }, [state.results]);

  const canGenerate = Boolean(state.dPop) && Boolean(state.dTier);

  const handleGenerate = () => {
    const roomCount = Number(roomCountInput);
    if (!isValidRoomCount(roomCount)) {
      setError('Room count must be an integer between 1 and 40.');
      return;
    }
    setError('');
    generateDungeon({ roomCount, popMode: state.dPop, thr: state.dThr, tier: state.dTier });
  };

  const handleClear = () => {
    if (!confirmDiscard('Discard the generated dungeon? This cannot be undone.')) return;
    dispatch({ type: 'clearDungeon' });
  };

  const dungeon = state.results.dungeon;

  return (
    <Stack spacing={2}>
      <Stack spacing={1.5} sx={panelSx}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
          <Castle size={14} color={theme.palette.primary.main} />
          <Typography sx={titleSx}>Dungeon Explorer</Typography>
        </Box>
        <TextField
          label="Room count (1–40)"
          size="small"
          value={roomCountInput}
          onChange={(e) => {
            setRoomCountInput(e.target.value);
            if (error) setError('');
          }}
          error={Boolean(error)}
          helperText={error || undefined}
          sx={{ width: '180px' }}
        />
        <SelectorGroup
          label="Population mode"
          options={dPopContract.options}
          getId={dPopContract.getId}
          value={dPopContract.deriveValue(state)}
          onChange={(o) => dispatch(dPopContract.action(o))}
        />
        <TierSelector value={state.dTier} onChange={(tier) => dispatch({ type: 'setDTier', dTier: tier })} />
        <Box sx={dividerSx} />
        <Stack direction="row" spacing={1}>
          <Button variant="contained" startIcon={<Dices size={15} />} disabled={!canGenerate} onClick={handleGenerate}>
            Generate
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<Trash2 size={15} />}
            disabled={!dungeon}
            onClick={handleClear}
          >
            Clear
          </Button>
        </Stack>
      </Stack>

      {dungeon ? (
        <Box sx={roomsGridSx}>
          {dungeon.rooms.map((room) => <RoomCard key={room.id} room={room} />)}
        </Box>
      ) : (
        <Box sx={{ ...emptyStateSx, bgcolor: theme.palette.gmboard.panelOverlay }}>
          <Castle size={22} color={theme.palette.text.secondary} />
          <Typography sx={emptyTextSx}>
            No dungeon generated yet. Set a room count, population mode and tier, then press Generate.
          </Typography>
        </Box>
      )}
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

const titleSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.8rem',
  letterSpacing: '0.06em',
  color: 'primary.main',
};

const dividerSx = {
  borderTop: '1px solid',
  borderColor: 'divider',
};

const roomsGridSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
  gap: 1.25,
};

const emptyStateSx = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 1,
  p: 3,
  border: '1px dashed',
  borderColor: 'divider',
  borderRadius: 2,
  textAlign: 'center',
};

const emptyTextSx = {
  fontSize: '0.78rem',
  color: 'text.secondary',
  maxWidth: 360,
};
