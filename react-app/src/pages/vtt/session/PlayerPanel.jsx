import { Box, Stack } from '@mui/material';
import { MapPin } from 'lucide-react';
import { placedCharacterIds } from '../../../shared/campaign/roster.js';
import { usePortraits } from '../../../shared/character/profile/usePortraits.js';
import PiecePreview from '../tokens/PiecePreview.jsx';
import TokenComposer from '../tokens/TokenComposer.jsx';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import EmptyLine from '../../../shared/ui/EmptyLine.jsx';
import Caption from '../../../shared/ui/Caption.jsx';
import RosterCharacterList from '../tokens/RosterCharacterList.jsx';

// What a player can do to the board. Deliberately short: place their own
// character, add a token piece of their own (name, colour, picture), and move
// or pick up either. Everything else on the map belongs to the GM, and the
// database says so too — this panel only stops them being offered a write that
// would be refused.
export default function PlayerPanel({
  roster,
  tokens,
  ownedCharacterIds,
  busy,
  onPlaceCharacter,
  onRemoveCharacter,
  onAddToken,
  onPlacementDragStart,
  onPlacementDragEnd,
  placementDisabled = false,
}) {
  const placed = placedCharacterIds(tokens);
  const mine = (roster || []).filter((entry) => ownedCharacterIds.includes(entry.characterId));
  const portraits = usePortraits(mine.map((entry) => entry.portraitPath));

  return (
    <Box sx={panelInnerSx}>
      <Stack spacing={1.25}>
        {mine.length ? (
          <RosterCharacterList
            roster={mine}
            portraits={portraits}
            placed={placed}
            busy={busy}
            placementDisabled={placementDisabled}
            onPlaceCharacter={onPlaceCharacter}
            onRemoveCharacter={onRemoveCharacter}
            onPlacementDragStart={onPlacementDragStart}
            onPlacementDragEnd={onPlacementDragEnd}
          />
        ) : (
          <EmptyLine>None of your characters is attached to this campaign yet.</EmptyLine>
        )}

        <TokenComposer
          layer="tokens"
          openLabel="Add token piece"
          busy={busy}
          disabled={placementDisabled}
          onAdd={onAddToken}
          onPlacementDragStart={onPlacementDragStart}
          onPlacementDragEnd={onPlacementDragEnd}
        />

        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'flex-start' }}>
          <Box sx={{ color: 'text.secondary', mt: 0.25 }}><MapPin size={ICON_SIZES.xs} /></Box>
          <Caption>
            Right-click any creature to flag a condition on it — that works on enemies too.
          </Caption>
        </Stack>
      </Stack>
    </Box>
  );
}


const panelInnerSx = { p: 0, bgcolor: 'transparent', backgroundImage: 'none' };

