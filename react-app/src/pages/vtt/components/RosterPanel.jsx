import { useEffect, useState } from 'react';
import {
  Box, Button, Collapse, IconButton, Stack, TextField, Typography,
} from '@mui/material';
import {
  ImagePlus, Plus, Skull, Swords, X,
} from 'lucide-react';
import ColorField from '../../../components/ColorField.jsx';
import { placedCharacterIds } from '../../../shared/campaign/roster.js';
import { usePortraits } from '../../../shared/character/usePortraits.js';
import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import PiecePreview, { beginPiecePointerDrag } from './PiecePreview.jsx';

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
  const [looseTokenOpen, setLooseTokenOpen] = useState(false);
  const [looseTokenName, setLooseTokenName] = useState('Token');
  const [looseTokenColor, setLooseTokenColor] = useState(VTT_COLORS.dungeon);
  const [looseTokenImage, setLooseTokenImage] = useState(null);
  const [looseTokenImageUrl, setLooseTokenImageUrl] = useState(null);

  useEffect(() => {
    if (!looseTokenImage) {
      setLooseTokenImageUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(looseTokenImage);
    setLooseTokenImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [looseTokenImage]);

  const looseTokenLabel = looseTokenName.trim()
    || (activeLayer === 'gm' ? 'Hidden' : 'Token');
  const looseTokenPlacement = {
    kind: 'token',
    token: {
      layer: activeLayer,
      label: looseTokenLabel,
      color: looseTokenColor,
      w: 1,
      h: 1,
      ...(looseTokenImage ? { imageFile: looseTokenImage, imageUrl: looseTokenImageUrl } : {}),
    },
  };

  return (
    <Box sx={panelInnerSx}>
      <Stack spacing={1.25}>
        {!roster.length ? (
          <Typography variant="body2" color="text.secondary">
            No characters in this campaign yet.
          </Typography>
        ) : placementDisabled ? (
          <Typography variant="caption" color="text.secondary">
            Switch to the battlemap to place or move pieces.
          </Typography>
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
        <Button
          size="small"
          variant="outlined"
          startIcon={looseTokenOpen ? <X size={15} /> : <Plus size={15} />}
          disabled={placementDisabled || busy}
          aria-expanded={looseTokenOpen}
          onClick={() => setLooseTokenOpen((current) => !current)}
        >
          {looseTokenOpen
            ? 'Close token editor'
            : `Add ${LAYER_NAMES[activeLayer] || 'token'} piece`}
        </Button>
        <Collapse in={looseTokenOpen} unmountOnExit>
          <Stack spacing={1} sx={composerSx}>
            <Box
              role="button"
              tabIndex={0}
              aria-disabled={busy || placementDisabled}
              aria-label="Drag generic token to map"
              onPointerDown={(event) => {
                if (busy || placementDisabled) return;
                beginPiecePointerDrag(event, looseTokenPlacement, {
                  onPlacementDragStart,
                  onPlacementDragEnd,
                });
              }}
              onKeyDown={(event) => {
                if (busy || placementDisabled || !['Enter', ' '].includes(event.key)) return;
                event.preventDefault();
                onAddToken?.(looseTokenPlacement.token);
              }}
              sx={{
                ...tokenDraftSx,
                ...((busy || placementDisabled) ? tokenDraftDisabledSx : null),
              }}
            >
              <PiecePreview token={looseTokenPlacement.token} size={42} />
              <Typography noWrap sx={draftNameSx}>{looseTokenLabel}</Typography>
            </Box>
            <TextField
              size="small"
              label="Token name"
              value={looseTokenName}
              slotProps={{ htmlInput: { maxLength: 60 } }}
              onChange={(event) => setLooseTokenName(event.target.value)}
            />
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
              <ColorField
                value={looseTokenColor}
                onChange={setLooseTokenColor}
                label="Token color"
                sx={tokenColorSx}
              />
              <Button component="label" size="small" startIcon={<ImagePlus size={14} />}>
                {looseTokenImage ? 'Change image' : 'Image'}
                <Box
                  component="input"
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(event) => setLooseTokenImage(event.target.files?.[0] || null)}
                />
              </Button>
              {looseTokenImage ? (
                <IconButton size="small" aria-label="Remove token image" onClick={() => setLooseTokenImage(null)}>
                  <X size={14} />
                </IconButton>
              ) : null}
              <Button
                size="small"
                variant="contained"
                disabled={busy || placementDisabled}
                onClick={() => onAddToken?.(looseTokenPlacement.token)}
                sx={{ ml: 'auto !important' }}
              >
                Place
              </Button>
            </Stack>
          </Stack>
        </Collapse>
        {/* Two ways in, because they answer different questions: a prepared
            fight, or the creature nobody planned for. */}
        <Button
          size="small"
          variant="outlined"
          startIcon={<Skull size={15} />}
          disabled={placementDisabled || busy}
          onClick={onPlaceMonster}
        >
          Place a creature
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<Swords size={15} />}
          disabled={placementDisabled || busy}
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
  touchAction: 'none',
  userSelect: 'none',
};

const panelInnerSx = { p: 0, bgcolor: 'transparent', backgroundImage: 'none' };

const composerSx = {
  mt: 0.75,
  p: 1,
  border: `1px solid ${vttAlpha(VTT_COLORS.gold, 0.25)}`,
  borderRadius: 1,
  bgcolor: vttAlpha(VTT_COLORS.black, 0.2),
};

const tokenDraftSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  p: 0.75,
  borderRadius: 1,
  border: `1px dashed ${vttAlpha(VTT_COLORS.gold, 0.55)}`,
  touchAction: 'none',
  userSelect: 'none',
  cursor: 'grab',
};

const tokenDraftDisabledSx = { opacity: 0.5, cursor: 'default' };

const draftNameSx = { minWidth: 0, fontSize: '0.82rem', color: 'text.primary' };

const tokenColorSx = {
  width: 38,
  height: 30,
  p: 0.25,
  borderRadius: 1,
  border: `1px solid ${vttAlpha(VTT_COLORS.gold, 0.4)}`,
  bgcolor: vttAlpha(VTT_COLORS.black, 0.3),
  cursor: 'pointer',
};

const nameSx = {
  flex: 1,
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontSize: '0.85rem',
};
