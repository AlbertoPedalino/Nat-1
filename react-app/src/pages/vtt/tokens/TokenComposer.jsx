import { useEffect, useState } from 'react';
import {
  Box, Button, Collapse, IconButton, Stack, TextField, Typography,
} from '@mui/material';
import { ImagePlus, Plus, X } from 'lucide-react';
import ColorField from '../../../shared/ui/ColorField.jsx';
import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import PiecePreview, { beginPiecePointerDrag } from './PiecePreview.jsx';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';

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
      <Button
        size="small"
        variant="outlined"
        startIcon={open ? <X size={15} /> : <Plus size={15} />}
        disabled={blocked}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? 'Close token editor' : openLabel}
      </Button>
      <Collapse in={open} unmountOnExit>
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
            <Button component="label" size="small" startIcon={<ImagePlus size={14} />}>
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
                <X size={14} />
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
      </Collapse>
    </>
  );
}

const composerSx = {
  mt: 0.75,
  p: 1,
  border: `1px solid ${vttAlpha(VTT_COLORS.gold, 0.25)}`,
  borderRadius: 1,
  bgcolor: vttAlpha(VTT_COLORS.black, 0.2),
};

const draftSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  p: 0.75,
  borderRadius: 1,
  border: `1px dashed ${vttAlpha(VTT_COLORS.gold, 0.55)}`,
  touchAction: 'pan-y',
  WebkitTouchCallout: 'none',
  userSelect: 'none',
  cursor: 'grab',
};

const draftDisabledSx = { opacity: 0.5, cursor: 'default' };

const draftNameSx = { minWidth: 0, fontSize: FONT_SIZES.xl, color: 'text.primary' };

