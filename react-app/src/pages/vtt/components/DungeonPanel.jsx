import { useState } from 'react';
import {
  Box, Button, CircularProgress, MenuItem, Stack, TextField, Typography, useTheme,
} from '@mui/material';
import {
  Coins, Dices, Flame, Leaf, Swords, Trash2, Users,
} from 'lucide-react';
import { DUNGEON_POPULATION_OPTIONS, TIER_OPTIONS } from '../../gmboard/logic/constants.js';
import { MAX_ROOM_COUNT, MIN_ROOM_COUNT, isValidRoomCount } from '../../gmboard/logic/dungeon.js';
import { describeGroups } from '../../../shared/dungeon/roomBudget.js';
import { MARKER_COLORS } from '../../../shared/dungeon/roomMarkers.js';
import InfoHint from '../../../components/InfoHint.jsx';
import PiecePreview, { beginPieceDrag } from './PiecePreview.jsx';

// The dungeon this map is being played as.
//
// No floor plan is read and none is needed: the GM says how many rooms, and the
// GM Board's own engine rolls them. That is the same panel for a generated
// dungeon, a cave, a dwelling and a map drawn on paper — the alternative worked
// for one export of one generator and for nothing else.
//
// Nothing is placed automatically either. What a room holds is dragged onto the
// map where the GM wants it, which is the one thing they can see and the panel
// cannot: which part of the picture is room three.
export default function DungeonPanel({
  dungeonKey, fights, busy, error, partySize, linkHint, title,
  onRoll, onClear, onSendRoom, monstersForRoom, markersForRoom,
  onPlacementDragStart, onPlacementDragEnd,
}) {
  const theme = useTheme();
  const [rooms, setRooms] = useState('8');
  const [popMode, setPopMode] = useState('random');
  const [tier, setTier] = useState(1);
  const roomCount = Number(rooms);

  return (
    <Stack spacing={1.1}>
      <Stack direction="row" spacing={0.75}>
        <TextField
          label="Rooms"
          size="small"
          type="number"
          value={rooms}
          disabled={busy}
          onChange={(event) => setRooms(event.target.value)}
          slotProps={{ htmlInput: { min: MIN_ROOM_COUNT, max: MAX_ROOM_COUNT } }}
          sx={{ width: 90 }}
        />
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
          sx={{ width: 92 }}
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
          disabled={busy || !isValidRoomCount(roomCount)}
          onClick={() => onRoll({
            roomCount,
            popMode,
            thr: DUNGEON_POPULATION_OPTIONS.find((option) => option.id === popMode)?.thr ?? 0,
            tier,
          })}
        >
          {dungeonKey ? 'Roll it again' : 'Roll the dungeon'}
        </Button>
        {dungeonKey ? (
          <Button size="small" startIcon={<Trash2 size={14} />} disabled={busy} onClick={onClear}>
            Clear
          </Button>
        ) : null}
        <InfoHint
          label="About rolling a dungeon"
          text="Every room is rolled on the GM Board's own dungeon tables: complications, and from those encounters, traps and hazards, plus loot with a recovery DC. Rolling again replaces the lot — nothing already on the map is removed."
        />
      </Stack>

      {error ? <Typography sx={warnSx}>{error}</Typography> : null}

      {!dungeonKey ? (
        <Typography sx={hintSx}>
          Say how many rooms the map has and roll them. Nothing is read from the picture, so this
          works the same for a cave, a dwelling or a map you drew yourself.
        </Typography>
      ) : null}

      {(dungeonKey?.rooms || []).map((keyRoom, index) => {
        const number = index + 1;
        const chosen = monstersForRoom?.(number) || null;
        const markers = markersForRoom?.(number) || [];
        const sent = fights?.[keyRoom.id] || null;
        return (
          <Box key={keyRoom.id} sx={roomSx}>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'baseline' }}>
              <Typography sx={numberSx}>{number}</Typography>
              <Typography sx={roomMetaSx}>{keyRoom.popLabel}</Typography>
            </Stack>

            {(keyRoom.slots || []).map((slot) => (
              <SlotLine key={`${keyRoom.id}-${slot.n}`} slot={slot} tones={theme.palette.gmboard} />
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
              <>
                <Stack direction="row" spacing={0.6} sx={{ alignItems: 'center' }}>
                  <Users size={13} color={theme.palette.gmboard.result.encounter} />
                  <Typography sx={lineSx}>{describeGroups(chosen.groups, chosen.budget)}</Typography>
                </Stack>

                {/* Sent to the builder first, dragged onto the map second. The
                    order matters: a piece dropped from a fight carries that
                    fight's own reference, so the creature on the board and the
                    one being tracked are the same creature from round one. */}
                {sent ? (
                  <Stack
                    direction="row"
                    spacing={0.6}
                    sx={dragSx}
                    draggable
                    onDragStart={(event) => {
                      beginPieceDrag(event);
                      onPlacementDragStart?.({
                        kind: 'encounter',
                        layer: 'tokens',
                        instanceId: sent.instanceId,
                        fightId: sent.fightId,
                        combatants: sent.combatants,
                        token: previewToken(chosen.groups),
                      });
                    }}
                    onDragEnd={onPlacementDragEnd}
                  >
                    <PiecePreview token={previewToken(chosen.groups)} size={26} />
                    <Typography sx={lineSx}>Drag onto the map — “{sent.name}”</Typography>
                  </Stack>
                ) : (
                  <Button
                    size="small"
                    sx={actionSx}
                    startIcon={<Swords size={13} />}
                    disabled={busy}
                    onClick={() => onSendRoom(number, { title })}
                  >
                    Send to the Encounter Builder
                  </Button>
                )}
              </>
            ) : null}

            {markers.length ? (
              <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                {markers.map((marker) => (
                  <Box
                    key={`${keyRoom.id}-${marker.label}`}
                    sx={markerSx}
                    draggable
                    onDragStart={(event) => {
                      beginPieceDrag(event);
                      onPlacementDragStart?.({
                        kind: 'object',
                        // `key`, not `iconKey`: the map's own object placement
                        // reads that field and returns without a word when it
                        // is missing, so a marker dragged with the wrong name
                        // simply never arrived.
                        object: {
                          key: marker.iconKey,
                          label: marker.label,
                          // The DC and the damage are the GM's note. Kept off the
                          // row so that showing the trap to the party later shows
                          // them the icon and not the numbers.
                          secretLabel: true,
                          layer: 'gm',
                          color: MARKER_COLORS[marker.kind],
                        },
                        token: {
                          iconKey: marker.iconKey,
                          label: marker.label,
                          color: MARKER_COLORS[marker.kind],
                          w: 1,
                          h: 1,
                        },
                      });
                    }}
                    onDragEnd={onPlacementDragEnd}
                  >
                    {marker.label}
                  </Box>
                ))}
              </Stack>
            ) : null}
          </Box>
        );
      })}

      {dungeonKey && linkHint ? <Typography sx={warnSx}>{linkHint}</Typography> : null}

      {dungeonKey ? (
        <Typography sx={hintSx}>
          Encounters are sized for a party of {partySize}. Creatures land on the piece layer;
          traps and hoards on the GM layer, where the table cannot read them. Right-click one and
          clear “Hidden from the players” to spring it.
        </Typography>
      ) : null}
    </Stack>
  );
}

// The first creature of the room stands in for the group while it is dragged.
function previewToken(groups) {
  const first = groups?.[0]?.monster;
  return {
    label: first?.name || 'Creature',
    color: '#7a5aa8',
    w: 1,
    h: 1,
  };
}

function SlotLine({ slot, tones }) {
  const extra = slot.extra;
  if (!extra) return <Typography sx={lineSx}>{slot.type}</Typography>;
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
      <Typography sx={lineSx}>
        {slot.type}{extra.data?.gravita ? ` · ${extra.data.gravita}` : ''}
      </Typography>
    </Stack>
  );
}

const hintSx = { fontSize: '0.7rem', color: 'text.secondary', lineHeight: 1.45 };
const warnSx = { fontSize: '0.7rem', color: 'warning.main', lineHeight: 1.4 };
const lineSx = { fontSize: '0.72rem', color: 'text.primary' };

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

const actionSx = { px: 0.75, minWidth: 0, fontSize: '0.66rem', textTransform: 'none' };

const dragSx = {
  alignItems: 'center',
  p: 0.4,
  borderRadius: 1,
  border: '1px dashed',
  borderColor: 'primary.main',
  cursor: 'grab',
};

const markerSx = {
  px: 0.6,
  py: 0.25,
  borderRadius: 1,
  border: '1px dashed',
  borderColor: 'divider',
  fontSize: '0.66rem',
  cursor: 'grab',
};
