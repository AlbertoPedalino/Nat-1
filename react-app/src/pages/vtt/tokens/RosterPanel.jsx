import { Box, Button, Stack } from '@mui/material';
import { Skull, Swords } from 'lucide-react';
import { placedCharacterIds } from '../../../shared/campaign/roster.js';
import { usePortraits } from '../../../shared/character/profile/usePortraits.js';
import PiecePreview from './PiecePreview.jsx';
import TokenComposer from './TokenComposer.jsx';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import EmptyLine from '../../../shared/ui/EmptyLine.jsx';
import Caption from '../../../shared/ui/Caption.jsx';
import RosterCharacterList from './RosterCharacterList.jsx';

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

        <RosterCharacterList
          roster={roster}
          portraits={portraits}
          placed={placed}
          busy={busy}
          placementDisabled={placementDisabled}
          onPlaceCharacter={onPlaceCharacter}
          onRemoveCharacter={onRemoveCharacter}
          onPlacementDragStart={onPlacementDragStart}
          onPlacementDragEnd={onPlacementDragEnd}
        />

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


const panelInnerSx = { p: 0, bgcolor: 'transparent', backgroundImage: 'none' };

