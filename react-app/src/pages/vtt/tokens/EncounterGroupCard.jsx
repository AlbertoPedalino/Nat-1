import { Box, Typography } from '@mui/material';
import PiecePreview, { beginPiecePointerDrag } from './PiecePreview.jsx';
import { placementCardSx } from './encounterImportStyles.js';
import Caption from '../../../shared/ui/Caption.jsx';

// The group about to be placed: a preview that can be dragged onto the map,
// and a line saying what placing it will do.
export default function EncounterGroupCard({
  combatants, preview, layer, instanceId, selected, busy, bestiaryLoading,
  onPlacementDragStart, onPlacementDragEnd,
}) {
  return (
    <Box
      onPointerDown={preview && !busy ? (event) => beginPiecePointerDrag(event, {
        kind: 'encounter',
        combatants,
        layer,
        instanceId,
        fightId: selected?.fight?.id || null,
        // An encounter with no fight is launched where it lands, so
        // what travels is the encounter rather than a snapshot this
        // dialog would have had to write in order to hand one over.
        encounterId: selected?.encounterId ?? null,
        token: preview,
        count: combatants.length,
      }, { onPlacementDragStart, onPlacementDragEnd }) : undefined}
      sx={{ ...placementCardSx, cursor: preview && !busy ? 'grab' : 'default' }}
    >
      {preview ? <PiecePreview token={preview} count={combatants.length} size={44} /> : null}
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2">
          {bestiaryLoading
            ? 'Loading the bestiary…'
            : (combatants.length
              ? `${combatants.length} creature${combatants.length === 1 ? '' : 's'} to place`
              : 'Nothing to import from this fight.')}
        </Typography>
        <Caption>
          {combatants.length
            ? (selected?.fight
              ? 'Drag this group with mouse, touch or pen, or use Place them.'
              : 'Never launched: placing it starts its fight in the Encounter Builder.')
            : 'Player characters are skipped: they are already on the map.'}
        </Caption>
      </Box>
    </Box>
  );
}
