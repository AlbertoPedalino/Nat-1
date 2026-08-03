import { Box, Button, Stack, Typography } from '@mui/material';
import { Plus, Skull, Swords } from 'lucide-react';
import { placedCharacterIds } from '../../../shared/campaign/roster.js';
import { usePortraits } from '../../../shared/character/usePortraits.js';
import PiecePreview, { beginPieceDrag } from './PiecePreview.jsx';

const LAYER_NAMES = { map: 'map', tokens: 'token', gm: 'GM' };

// Party pieces come from the campaign roster, so the GM never types a member's
// name by hand. Drag one onto the map to place it exactly, or use the button to
// drop it on the first free square.
export default function RosterPanel({
  roster,
  tokens,
  busy,
  activeLayer,
  onPlaceCharacter,
  onAddToken,
  onImportEncounter,
  onPlaceMonster,
  onPlacementDragStart,
  onPlacementDragEnd,
}) {
  const placed = placedCharacterIds(tokens);
  const portraits = usePortraits((roster || []).map((entry) => entry.portraitPath));

  return (
    <Box sx={panelInnerSx}>
      <Stack spacing={1.25}>
        {!roster.length ? (
          <Typography variant="body2" color="text.secondary">
            No characters in this campaign yet.
          </Typography>
        ) : (
          <Typography variant="caption" color="text.secondary">
            Drag onto the map, or click to place.
          </Typography>
        )}

        <Stack spacing={0.5}>
          {roster.map((entry) => {
            const isPlaced = placed.has(entry.characterId);
            return (
              <Box
                key={entry.characterId}
                draggable={!isPlaced && !busy}
                onDragStart={(event) => {
                  event.dataTransfer.setData('application/x-gb-character', entry.characterId);
                  beginPieceDrag(event);
                  onPlacementDragStart?.({
                    kind: 'character',
                    characterId: entry.characterId,
                    token: {
                      characterId: entry.characterId,
                      label: entry.name,
                      color: entry.color,
                      className: entry.className,
                      deathSaves: entry.deathSaves,
                      imageUrl: portraits[entry.portraitPath] || null,
                      layer: 'tokens',
                      w: 1,
                      h: 1,
                    },
                  });
                }}
                onDragEnd={onPlacementDragEnd}
                sx={{ ...rowSx, cursor: isPlaced ? 'default' : 'grab' }}
              >
                <PiecePreview token={{
                  characterId: entry.characterId,
                  label: entry.name,
                  color: entry.color,
                  className: entry.className,
                  imageUrl: portraits[entry.portraitPath] || null,
                }} />
                <Typography sx={nameSx}>{entry.name}</Typography>
                <Button
                  size="small"
                  variant={isPlaced ? 'text' : 'outlined'}
                  disabled={isPlaced || busy}
                  onClick={() => onPlaceCharacter(entry)}
                >
                  {isPlaced ? 'On map' : 'Place'}
                </Button>
              </Box>
            );
          })}
        </Stack>

        {/* New pieces land on the layer being edited: there is no separate
            "hidden token" button, because the GM layer is a layer. */}
        <Button
          size="small"
          variant="outlined"
          startIcon={<Plus size={15} />}
          disabled={busy}
          onClick={onAddToken}
        >
          Add {LAYER_NAMES[activeLayer] || 'token'} piece
        </Button>
        {/* Two ways in, because they answer different questions: a prepared
            fight, or the creature nobody planned for. */}
        <Button
          size="small"
          variant="outlined"
          startIcon={<Skull size={15} />}
          disabled={busy}
          onClick={onPlaceMonster}
        >
          Place a creature
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<Swords size={15} />}
          disabled={busy}
          onClick={onImportEncounter}
        >
          Import encounter
        </Button>
        <Typography variant="caption" color="text.secondary">
          {activeLayer === 'gm'
            ? 'GM pieces are filtered out by the database, not just hidden in the view.'
            : 'Right-click a piece for its label and conditions.'}
        </Typography>
      </Stack>
    </Box>
  );
}

const rowSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  py: 0.25,
};

const panelInnerSx = { p: 0, bgcolor: 'transparent', backgroundImage: 'none' };

const nameSx = {
  flex: 1,
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontSize: '0.85rem',
};
