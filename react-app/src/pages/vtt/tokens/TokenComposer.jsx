import { useEffect, useState } from 'react';
import {
  Box, Button, IconButton, Stack, TextField, Typography,
} from '@mui/material';
import { ImagePlus, Plus, X } from 'lucide-react';
import ColorField from '../../../shared/ui/ColorField.jsx';
import DisclosureButton from '../../../shared/ui/DisclosureButton.jsx';
import CollapsibleBody from '../../../shared/ui/CollapsibleBody.jsx';
import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import PiecePreview, { beginPiecePointerDrag } from './PiecePreview.jsx';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { OPACITY } from '../../../shared/ui/colors.js';
import { tintedSurfaceSx } from '../../../shared/ui/surfaces.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import { DRAG_SOURCE_SX } from '../../../shared/ui/interactive.js';

// A loose piece built by hand: a name, a colour and a picture. Drag the preview
// onto the map to put it exactly, or press Place to drop it in view. The GM and
// the players share it; a player's picture goes into a live scene of their
// campaign, which is all supabase/25_player_token_images.sql lets them upload.
export default function TokenComposer({
  layer = 'tokens',
  emptyLabel = 'Token',
  openLabel,
  busy = false,
  disabled = false,
  onAdd,
  onPlacementDragStart,
  onPlacementDragEnd,
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('Token');
  const [color, setColor] = useState(VTT_COLORS.dungeon);
  const [image, setImage] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);

  useEffect(() => {
    if (!image) {
      setImageUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(image);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  const label = name.trim() || emptyLabel;
  const placement = {
    kind: 'token',
    token: {
      layer,
      label,
      color,
      w: 1,
      h: 1,
      ...(image ? { imageFile: image, imageUrl } : {}),
    },
  };
  const blocked = busy || disabled;

  return (
    <>
      <DisclosureButton
        open={open}
        onToggle={() => setOpen((current) => !current)}
        icon={open ? null : <Plus size={ICON_SIZES.sm} />}
        label={open ? 'Close token editor' : openLabel}
        disabled={blocked}
      />
      <CollapsibleBody open={open}>
        <Stack spacing={1} sx={composerSx}>
          <Box
            role="button"
            tabIndex={0}
            aria-disabled={blocked}
            aria-label="Drag generic token to map"
            onPointerDown={(event) => {
              if (blocked) return;
              beginPiecePointerDrag(event, placement, {
                onPlacementDragStart,
                onPlacementDragEnd,
              });
            }}
            onKeyDown={(event) => {
              if (blocked || !['Enter', ' '].includes(event.key)) return;
              event.preventDefault();
              onAdd?.(placement.token);
            }}
            sx={{ ...draftSx, ...(blocked ? draftDisabledSx : null) }}
          >
            <PiecePreview token={placement.token} size={42} />
            <Typography noWrap sx={draftNameSx}>{label}</Typography>
          </Box>
          <TextField
            size="small"
            label="Token name"
            value={name}
            slotProps={{ htmlInput: { maxLength: 60 } }}
            onChange={(event) => setName(event.target.value)}
          />
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <ColorField
              value={color}
              onChange={setColor}
              label="Token color"
            />
            <Button component="label" size="small" startIcon={<ImagePlus size={ICON_SIZES.sm} />}>
              {image ? 'Change image' : 'Image'}
              <Box
                component="input"
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => setImage(event.target.files?.[0] || null)}
              />
            </Button>
            {image ? (
              <IconButton size="small" aria-label="Remove token image" onClick={() => setImage(null)}>
                <X size={ICON_SIZES.sm} />
              </IconButton>
            ) : null}
            <Button
              size="small"
              variant="contained"
              disabled={blocked}
              onClick={() => onAdd?.(placement.token)}
              sx={{ ml: 'auto !important' }}
            >
              Place
            </Button>
          </Stack>
        </Stack>
      </CollapsibleBody>
    </>
  );
}

const composerSx = {
  mt: 0.75,
  p: 1,
  border: `1px solid ${vttAlpha(VTT_COLORS.accent, OPACITY.shade)}`,
  borderRadius: 1,
  // Darkened over the panel's own surface, so the composer stays solid.
  ...tintedSurfaceSx(VTT_COLORS.black, { amount: OPACITY.shade, base: VTT_COLORS.surface }),
};

const draftSx = {
  ...DRAG_SOURCE_SX,
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  p: 0.75,
  borderRadius: 1,
  border: `1px dashed ${vttAlpha(VTT_COLORS.accent, OPACITY.strong)}`,
};

const draftDisabledSx = { opacity: OPACITY.strong, cursor: 'default' };

const draftNameSx = { minWidth: 0, fontSize: FONT_SIZES.xl, color: 'text.primary' };

