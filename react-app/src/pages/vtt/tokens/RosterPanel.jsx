import { Box, Button, Stack, Typography } from '@mui/material';
import { Skull, Swords } from 'lucide-react';
import { placedCharacterIds } from '../../../shared/campaign/roster.js';
import { usePortraits } from '../../../shared/character/profile/usePortraits.js';
import PiecePreview, { beginPiecePointerDrag } from './PiecePreview.jsx';
import TokenComposer from './TokenComposer.jsx';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import EmptyLine from '../../../shared/ui/EmptyLine.jsx';
import Caption from '../../../shared/ui/Caption.jsx';
import { ONE_LINE_SX } from '../../../shared/ui/textStyles.js';

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
  onRemoveCharacter,
  onAddToken,
  onImportEncounter,
  onPlaceMonster,
  onPlacementDragStart,
  onPlacementDragEnd,
  placementDisabled = false,
}) {
  const placed = placedCharacterIds(tokens);
  const portraits = usePortraits((roster || []).map((entry) => entry.portraitPath));

  return (
    <Box sx={panelInnerSx}>
      <Stack spacing={1.25}>
        {!roster.length ? (
          <EmptyLine>No characters in this campaign yet.</EmptyLine>
        ) : placementDisabled ? (
          <Caption>
            Switch to the battlemap to place or move pieces.
          </Caption>
        ) : null}

        <Stack spacing={0.5}>
          {roster.map((entry) => {
            const isPlaced = placed.has(entry.characterId);
            const placement = {
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
            };
            return (
              <Box
                key={entry.characterId}
                onPointerDown={(event) => {
                  if (isPlaced || placementDisabled || busy) return;
                  beginPiecePointerDrag(event, placement, {
                    onPlacementDragStart,
                    onPlacementDragEnd,
                  });
                }}
                sx={{
                  ...rowSx,
                  cursor: isPlaced || placementDisabled || busy ? 'default' : 'grab',
                }}
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
                  disabled={busy || (!isPlaced && placementDisabled)}
                  onClick={() => (isPlaced
                    ? onRemoveCharacter?.(entry)
                    : onPlaceCharacter(entry))}
                >
                  {isPlaced ? 'Remove' : 'Place'}
                </Button>
              </Box>
            );
          })}
        </Stack>

        {/* New pieces land on the layer being edited: there is no separate
            "hidden token" button, because the GM layer is a layer. */}
        <TokenComposer
          layer={activeLayer}
          emptyLabel={activeLayer === 'gm' ? 'Hidden' : 'Token'}
          openLabel={`Add ${LAYER_NAMES[activeLayer] || 'token'} piece`}
          busy={busy}
          disabled={placementDisabled}
          onAdd={onAddToken}
          onPlacementDragStart={onPlacementDragStart}
          onPlacementDragEnd={onPlacementDragEnd}
        />
        {/* Two ways in, because they answer different questions: a prepared
            fight, or the creature nobody planned for. */}
        <Button
          size="small"
          variant="outlined"
          startIcon={<Skull size={ICON_SIZES.sm} />}
          disabled={placementDisabled || busy}
          onClick={onPlaceMonster}
        >
          Place a creature
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<Swords size={ICON_SIZES.sm} />}
          disabled={placementDisabled || busy}
          onClick={onImportEncounter}
        >
          Import encounter
        </Button>
        <Caption>
          {activeLayer === 'gm'
            ? 'GM pieces are filtered out by the database, not just hidden in the view.'
            : 'Right-click a piece for its label and conditions.'}
        </Caption>
      </Stack>
    </Box>
  );
}

const rowSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  py: 0.25,
  touchAction: 'pan-y',
  WebkitTouchCallout: 'none',
  userSelect: 'none',
};

const panelInnerSx = { p: 0, bgcolor: 'transparent', backgroundImage: 'none' };

const nameSx = {
  ...ONE_LINE_SX,
  flex: 1,
  minWidth: 0,
  fontSize: FONT_SIZES.xxl,
};
