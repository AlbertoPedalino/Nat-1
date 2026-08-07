import { useState } from 'react';
import {
  Box, Button, CircularProgress, MenuItem, Stack, TextField, Typography, alpha, useTheme,
} from '@mui/material';
import {
  Coins, Dices, Flame, Leaf, Swords, Users,
} from 'lucide-react';
import { DUNGEON_POPULATION_OPTIONS, TIER_OPTIONS } from '../../gmboard/logic/constants.js';
import { describeGroups } from '../../../shared/dungeon/roomBudget.js';
import InfoHint from '../../../components/InfoHint.jsx';

// What is in each room of an imported dungeon, and putting it on the board.
//
// The rolling is the GM Board's own, fed the room count the plan actually has.
// What this panel adds is the step nobody wants to do by hand: an encounter
// worth 1,100 XP a head becomes four creatures that come to about that, placed
// in the room they were rolled for.
export default function DungeonPanel({
  plan, dungeonKey, placed, busy, preparing, error, partySize,
  onPopulate, onPlaceRoom, monstersForRoom, markersForRoom,
}) {
  const theme = useTheme();
  const [popMode, setPopMode] = useState('random');
  const [tier, setTier] = useState(1);

  if (!plan) return null;
  const rooms = plan.rooms || [];

  return (
    <Stack spacing={1.1}>
      <Box>
        <Typography sx={titleSx}>{plan.title || 'Dungeon'}</Typography>
        <Typography sx={metaSx}>
          {rooms.length} rooms{plan.corridors?.length ? `, ${plan.corridors.length} corridors` : ''}
        </Typography>
      </Box>
      {plan.story ? <Typography sx={storySx}>{plan.story}</Typography> : null}

      <Stack direction="row" spacing={0.75}>
        <TextField
          select
          size="small"
          label="How busy"
          value={popMode}
          disabled={busy}
          onChange={(event) => setPopMode(event.target.value)}
          sx={{ flex: 1 }}
        >
          {DUNGEON_POPULATION_OPTIONS.map((option) => (
            <MenuItem key={option.id} value={option.id}>{option.label} · {option.sub}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Tier"
          value={tier}
          disabled={busy}
          onChange={(event) => setTier(Number(event.target.value))}
          sx={{ width: 110 }}
        >
          {TIER_OPTIONS.map((option) => (
            <MenuItem key={option.tier} value={option.tier}>{option.shortLabel}</MenuItem>
          ))}
        </TextField>
      </Stack>

      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
        <Button
          size="small"
          variant="contained"
          startIcon={busy ? <CircularProgress size={13} /> : <Dices size={15} />}
          disabled={busy}
          onClick={() => onPopulate({
            popMode,
            thr: DUNGEON_POPULATION_OPTIONS.find((option) => option.id === popMode)?.thr ?? 0,
            tier,
          })}
        >
          {dungeonKey ? 'Roll it again' : 'Roll the rooms'}
        </Button>
        <InfoHint
          label="About rolling the rooms"
          text="Every room is rolled on the GM Board's own dungeon tables: complications, and from those encounters, traps and hazards, plus loot with a recovery DC. Rolling again replaces the lot — nothing already placed on the map is removed."
        />
      </Stack>

      {error ? <Typography sx={warnSx}>{error}</Typography> : null}

      {preparing ? (
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
          <CircularProgress size={13} />
          <Typography sx={hintSx}>
            Filling the rooms and covering the map…
          </Typography>
        </Stack>
      ) : null}

      {!dungeonKey && !preparing ? (
        <Typography sx={hintSx}>
          Nothing rolled yet. The plan came in with the map; this fills it.
        </Typography>
      ) : null}

      {(dungeonKey?.rooms || []).map((keyRoom, index) => {
        const room = rooms[index];
        if (!room) return null;
        const chosen = monstersForRoom?.(room.number) || null;
        const markers = markersForRoom?.(room.number) || [];
        const already = placed?.[room.id]?.length || 0;
        const anything = Boolean(chosen?.groups?.length || markers.length);
        return (
          <Box key={room.id} sx={roomSx}>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'baseline' }}>
              <Typography sx={numberSx}>{room.number}</Typography>
              <Typography sx={roomMetaSx}>
                {room.w}×{room.h}
                {room.rotunda ? ' · round' : ''}
                {room.ending ? ' · dead end' : ''}
                {` · ${keyRoom.popLabel}`}
              </Typography>
            </Stack>

            {(room.notes || []).map((note) => (
              <Typography key={note.text} sx={noteSx}>“{note.text}”</Typography>
            ))}

            {(keyRoom.slots || []).map((slot) => (
              <SlotLine key={`${room.id}-${slot.n}`} slot={slot} tones={theme.palette.gmboard} />
            ))}

            {keyRoom.loot?.data?.tipo && keyRoom.loot.data.tipo !== 'Nothing found' ? (
              <Stack direction="row" spacing={0.6} sx={{ alignItems: 'center' }}>
                <Coins size={13} color={theme.palette.gmboard.result.loot} />
                <Typography sx={lineSx}>
                  {keyRoom.loot.data.tipo}
                  {keyRoom.loot.data.rarita && keyRoom.loot.data.rarita !== '—' ? ` · ${keyRoom.loot.data.rarita}` : ''}
                  {keyRoom.lootDc ? ` · DC ${keyRoom.lootDc.sum}` : ''}
                </Typography>
              </Stack>
            ) : null}

            {chosen?.groups?.length ? (
              <Stack direction="row" spacing={0.6} sx={{ alignItems: 'center' }}>
                <Users size={13} color={theme.palette.gmboard.result.encounter} />
                <Typography sx={lineSx}>{describeGroups(chosen.groups, chosen.budget)}</Typography>
              </Stack>
            ) : null}

            {anything ? (
              <Button
                size="small"
                sx={placeSx}
                disabled={busy}
                onClick={() => onPlaceRoom(room.number)}
              >
                {already
                  ? `Put it out again (${already} on the map)`
                  : `Put ${placeSummary(chosen, markers)} on the map`}
              </Button>
            ) : null}
          </Box>
        );
      })}

      {dungeonKey ? (
        <Typography sx={hintSx}>
          Creatures land on the piece layer, sized for a party of {partySize}; traps, hazards
          and hoards land on the GM layer, where the table cannot read them. Both go in the room
          they were rolled for — the fog is what keeps the creatures unseen until the door opens.
        </Typography>
      ) : null}
    </Stack>
  );
}

// "2 creatures and a trap" reads better on a button than a count of tokens.
function placeSummary(chosen, markers) {
  const parts = [];
  const creatures = (chosen?.groups || []).reduce((total, group) => total + group.count, 0);
  if (creatures) parts.push(`${creatures} creature${creatures === 1 ? '' : 's'}`);
  const kinds = markers.map((marker) => marker.kind);
  for (const kind of ['trap', 'hazard', 'loot']) {
    const count = kinds.filter((item) => item === kind).length;
    if (count) parts.push(count === 1 ? `a ${kind}` : `${count} ${kind}s`);
  }
  if (!parts.length) return 'it';
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`;
}

function SlotLine({ slot, tones }) {
  const extra = slot.extra;
  if (!extra) {
    return <Typography sx={lineSx}>{slot.type}</Typography>;
  }
  if (extra.kind === 'enc') {
    return (
      <Stack direction="row" spacing={0.6} sx={{ alignItems: 'center' }}>
        <Swords size={13} color={tones.result.encounter} />
        <Typography sx={lineSx}>
          {extra.data.diff} · Level {extra.data.lv} · {Number(extra.data.xp).toLocaleString()} XP/PC
        </Typography>
      </Stack>
    );
  }
  if (extra.kind === 'trap') {
    return (
      <Stack direction="row" spacing={0.6} sx={{ alignItems: 'center' }}>
        <Flame size={13} color={tones.result.trap} />
        <Typography sx={lineSx}>
          {extra.data.tipo} · DC {extra.data.dc} · {extra.data.danno}
        </Typography>
      </Stack>
    );
  }
  return (
    <Stack direction="row" spacing={0.6} sx={{ alignItems: 'center' }}>
      <Leaf size={13} color={tones.result.none} />
      <Typography sx={lineSx}>{slot.type}{extra.data?.gravita ? ` · ${extra.data.gravita}` : ''}</Typography>
    </Stack>
  );
}

const titleSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.85rem',
  color: 'primary.main',
};

const metaSx = { fontSize: '0.68rem', color: 'text.secondary' };
const storySx = { fontSize: '0.72rem', color: 'text.secondary', lineHeight: 1.45 };
const hintSx = { fontSize: '0.7rem', color: 'text.secondary', lineHeight: 1.45 };
const warnSx = { fontSize: '0.7rem', color: 'warning.main', lineHeight: 1.4 };
const lineSx = { fontSize: '0.72rem', color: 'text.primary' };
const noteSx = { fontSize: '0.7rem', color: 'text.secondary', fontStyle: 'italic' };

const roomSx = {
  p: 0.9,
  borderRadius: 1.5,
  border: '1px solid',
  borderColor: 'divider',
  display: 'flex',
  flexDirection: 'column',
  gap: 0.35,
};

const numberSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.95rem',
  color: 'primary.main',
  minWidth: 20,
};

const roomMetaSx = { fontSize: '0.66rem', color: 'text.secondary' };

const placeSx = {
  px: 0.75,
  minWidth: 0,
  fontSize: '0.66rem',
  textTransform: 'none',
};
