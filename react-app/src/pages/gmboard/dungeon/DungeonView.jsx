import { useEffect, useRef, useState } from 'react';
import { Box, Stack, TextField, useTheme } from '@mui/material';
import SelectorGroup from '../../../shared/gmboard/ui/SelectorGroup.jsx';
import TierSelector from '../../../shared/gmboard/ui/TierSelector.jsx';
import RoomCard from './RoomCard.jsx';
import { SELECTOR_CONTRACTS } from '../../../shared/gmboard/ui/selectorContracts.js';
import { isValidRoomCount, roomCountInputFrom } from '../../../shared/dungeon/dungeon.js';
import { useGmBoard } from '../state/GmBoardContext.jsx';
import BoardPanel from '../ui/BoardPanel.jsx';
import { boardCardGridSx } from '../../../shared/gmboard/ui/surfaces.js';
import GenerateActions from '../ui/GenerateActions.jsx';
import StatePanel from '../../../shared/ui/StatePanel.jsx';
import { GAME_ICONS } from '../../../shared/ui/gameIcons.js';

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

  const dungeon = state.results.dungeon;

  return (
    <Stack spacing={2}>
      <BoardPanel icon={GAME_ICONS.dungeon} title="Dungeon Explorer">
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
        <TierSelector value={state.dTier} onChange={(tier) => dispatch(SELECTOR_CONTRACTS.dTier.action({ tier }))} />
        <GenerateActions
          canGenerate={canGenerate}
          onGenerate={handleGenerate}
          hasResult={Boolean(dungeon)}
          clearMessage="Discard the generated dungeon? This cannot be undone."
          onClear={() => dispatch({ type: 'clearDungeon' })}
        />
      </BoardPanel>

      {dungeon ? (
        <Box sx={boardCardGridSx}>
          {dungeon.rooms.map((room) => <RoomCard key={room.id} room={room} />)}
        </Box>
      ) : (
        <StatePanel icon={GAME_ICONS.dungeon} title="No dungeon yet">
          Set a room count, population mode and tier, then press Generate.
        </StatePanel>
      )}
    </Stack>
  );
}

