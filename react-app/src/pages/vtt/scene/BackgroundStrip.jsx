import { useEffect, useRef, useState } from 'react';
import { Box, Button, ButtonBase, CircularProgress, IconButton, Stack } from '@mui/material';
import {
  ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ImagePlus, Images, Trash2,
} from 'lucide-react';
import { signMapImage } from '../../../shared/cloud/api/vttMapImages.js';
import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import { useStoredFlag } from '../../../shared/ui/useStoredFlag.js';
import { FONT_SIZES, LINE_HEIGHTS } from '../../../shared/ui/fonts.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { OPACITY } from '../../../shared/ui/colors.js';
import { SURFACES } from '../../../shared/ui/surfaces.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';

// Folded or open is this GM's own preference, kept across scenes and reloads.
const COLLAPSED_KEY = 'gb:vtt:background-strip-collapsed';

// The GM's slider through the scene's backgrounds, along the bottom of the map
// while a background is up. Only the GM ever gets it: players see whichever
// one is picked, never the choice.
export default function BackgroundStrip({
  backgrounds,
  selected,
  busy = false,
  onSelect,
  onAdd,
  onRemove,
}) {
  const fileRef = useRef(null);
  const selectedRef = useRef(null);
  // Removing deletes the uploaded file, so it takes a second click on the
  // same thumbnail's bin.
  const [armed, setArmed] = useState(null);
  const [collapsed, setCollapsed] = useStoredFlag(COLLAPSED_KEY);
  const toggleCollapsed = () => {
    setArmed(null);
    setCollapsed((current) => !current);
  };
  const index = backgrounds.indexOf(selected);
  const step = (delta) => {
    if (backgrounds.length < 2) return;
    const from = index < 0 ? 0 : index;
    onSelect(backgrounds[(from + delta + backgrounds.length) % backgrounds.length]);
  };

  useEffect(() => {
    selectedRef.current?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [selected]);

  useEffect(() => {
    if (armed && !backgrounds.includes(armed)) setArmed(null);
  }, [armed, backgrounds]);

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); step(1); }
  };

  if (collapsed) {
    return (
      <Button
        size="small"
        aria-label="Show the backgrounds"
        startIcon={<Images size={ICON_SIZES.sm} />}
        endIcon={<ChevronUp size={ICON_SIZES.sm} />}
        onClick={toggleCollapsed}
        sx={collapsedSx}
      >
        {backgrounds.length ? `${index < 0 ? 1 : index + 1} / ${backgrounds.length}` : 'Backgrounds'}
      </Button>
    );
  }

  return (
    <Stack
      direction="row"
      spacing={0.5}
      role="group"
      aria-label="Backgrounds"
      onKeyDown={handleKeyDown}
      sx={rootSx}
    >
      {backgrounds.length > 1 ? (
        <IconButton size="small" aria-label="Previous background" disabled={busy} onClick={() => step(-1)} sx={arrowSx}>
          <ChevronLeft size={ICON_SIZES.md} />
        </IconButton>
      ) : null}

      <Stack direction="row" spacing={0.75} sx={trackSx}>
        {backgrounds.map((path, position) => {
          const isSelected = path === selected;
          return (
            <Box key={path} ref={isSelected ? selectedRef : null} sx={thumbWrapSx}>
              <ButtonBase
                aria-label={`Show background ${position + 1}`}
                aria-pressed={isSelected}
                disabled={busy}
                onClick={() => { setArmed(null); if (!isSelected) onSelect(path); }}
                sx={thumbSx(isSelected)}
              >
                <Thumbnail path={path} />
                <Box component="span" sx={numberSx}>{position + 1}</Box>
              </ButtonBase>
              <IconButton
                size="small"
                className="bg-remove"
                aria-label={armed === path ? `Confirm removing background ${position + 1}` : `Remove background ${position + 1}`}
                title={armed === path ? 'Click again to delete this background' : 'Remove this background'}
                disabled={busy}
                onClick={() => {
                  if (armed === path) {
                    setArmed(null);
                    onRemove(path);
                  } else {
                    setArmed(path);
                  }
                }}
                sx={removeSx(armed === path)}
              >
                <Trash2 size={ICON_SIZES.xs} />
              </IconButton>
            </Box>
          );
        })}

        <ButtonBase
          aria-label="Add a background"
          title="Add a background"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          sx={addSx}
        >
          {busy ? <CircularProgress size={16} /> : <ImagePlus size={ICON_SIZES.lg} />}
        </ButtonBase>
      </Stack>

      {backgrounds.length > 1 ? (
        <IconButton size="small" aria-label="Next background" disabled={busy} onClick={() => step(1)} sx={arrowSx}>
          <ChevronRight size={ICON_SIZES.md} />
        </IconButton>
      ) : null}

      <IconButton size="small" aria-label="Hide the backgrounds" title="Fold the slider" onClick={toggleCollapsed} sx={arrowSx}>
        <ChevronDown size={ICON_SIZES.md} />
      </IconButton>

      <Box
        component="input"
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) onAdd(file);
        }}
      />
    </Stack>
  );
}

// Signed through the same cache as the map itself, so a thumbnail is the very
// download the switch will show, not a second one.
function Thumbnail({ path }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    signMapImage(path)
      .then((signed) => { if (!cancelled) setUrl(signed || null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [path]);
  return url
    ? <Box component="img" src={url} alt="" draggable={false} sx={imageSx} />
    : <Box sx={imageSx} />;
}

const THUMB_W = 92;
const THUMB_H = 52;

const rootSx = {
  ...SURFACES.mapControl,
  alignItems: 'center',
  p: 0.75,
  borderRadius: 1,
  boxShadow: 6,
  maxWidth: '100%',
  minWidth: 0,
};

const trackSx = {
  minWidth: 0,
  overflowX: 'auto',
  overflowY: 'hidden',
  // Room for the selected outline, which a scrolling box would clip.
  p: 0.5,
  scrollbarWidth: 'thin',
};

const thumbWrapSx = {
  position: 'relative',
  flexShrink: 0,
  '&:hover .bg-remove, &:focus-within .bg-remove': { opacity: 1 },
};

const thumbSx = (selected) => ({
  position: 'relative',
  width: THUMB_W,
  height: THUMB_H,
  borderRadius: 1,
  overflow: 'hidden',
  outline: selected ? `2px solid ${VTT_COLORS.accent}` : `1px solid ${vttAlpha(VTT_COLORS.accent, OPACITY.shade)}`,
  outlineOffset: selected ? 1 : 0,
  opacity: selected ? 1 : OPACITY.heavy,
  transition: 'opacity 120ms',
  '&:hover': { opacity: 1 },
  '&.Mui-focusVisible': { outline: `2px solid ${VTT_COLORS.accentHighlight}` },
});

const imageSx = {
  display: 'block',
  width: THUMB_W,
  height: THUMB_H,
  objectFit: 'cover',
  bgcolor: VTT_COLORS.surfaceRaised,
};

const numberSx = {
  position: 'absolute',
  left: 4,
  bottom: 3,
  px: 0.5,
  borderRadius: 0.5,
  bgcolor: vttAlpha(VTT_COLORS.surface, OPACITY.veil),
  color: VTT_COLORS.accent,
  ...TEXT_STYLES.figure,
  fontSize: FONT_SIZES.xs,
  lineHeight: LINE_HEIGHTS.normal,
};

const removeSx = (armed) => ({
  position: 'absolute',
  top: 2,
  right: 2,
  width: 22,
  height: 22,
  // Shown on hover or focus; always shown once armed so the second click lands.
  opacity: armed ? 1 : 0,
  color: armed ? VTT_COLORS.text : VTT_COLORS.danger,
  bgcolor: armed ? VTT_COLORS.hpCritical : vttAlpha(VTT_COLORS.surface, OPACITY.veil),
  '&:hover': { bgcolor: armed ? VTT_COLORS.dangerDeep : VTT_COLORS.surface },
  '@media (hover: none)': { opacity: 1 },
});

const addSx = {
  flexShrink: 0,
  width: THUMB_H,
  height: THUMB_H,
  borderRadius: 1,
  color: VTT_COLORS.accent,
  border: `1px dashed ${vttAlpha(VTT_COLORS.accent, OPACITY.strong)}`,
  '&:hover': { bgcolor: vttAlpha(VTT_COLORS.accent, OPACITY.soft) },
};

const collapsedSx = {
  ...SURFACES.mapControl,
  height: 32,
  px: 1.25,
  color: VTT_COLORS.accent,
  boxShadow: 6,
  ...TEXT_STYLES.title,
  fontSize: FONT_SIZES.sm,
  '&:hover': { bgcolor: vttAlpha(VTT_COLORS.surface, OPACITY.solid) },
};

const arrowSx = {
  flexShrink: 0,
  color: VTT_COLORS.accent,
  '&.Mui-disabled': { color: vttAlpha(VTT_COLORS.accent, OPACITY.line) },
};
