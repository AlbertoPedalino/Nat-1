import { useEffect, useMemo, useState } from 'react';
import { Box, Pagination, Typography } from '@mui/material';
import { Search } from 'lucide-react';
import { iconNames } from 'lucide-react/dynamic';
import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import {
  DEFAULT_MAP_OBJECT_STROKE,
  MAX_MAP_OBJECT_STROKE,
  MIN_MAP_OBJECT_STROKE,
  mapObjectLabel,
} from '../../../shared/vtt/map/mapObjects.js';
import { beginPiecePointerDrag } from '../tokens/PiecePreview.jsx';
import MapObjectGlyph from './MapObjectGlyph.jsx';
import { compareText } from '../../../shared/lists.js';
import ColorField from '../../../shared/ui/ColorField.jsx';
import { FONT_SIZES, LINE_HEIGHTS } from '../../../shared/ui/fonts.js';
import { OPACITY } from '../../../shared/ui/colors.js';
import { tintedSurfaceSx } from '../../../shared/ui/surfaces.js';
import { CONTROL_HEIGHTS } from '../../../shared/ui/controlHeights.js';
import { INK_EDGE } from '../../../shared/ui/shadows.js';
import EmptyLine from '../../../shared/ui/EmptyLine.jsx';
import { ONE_LINE_SX } from '../../../shared/ui/textStyles.js';
import { DRAG_SOURCE_SX } from '../../../shared/ui/interactive.js';
import SearchField from '../../../shared/ui/SearchField.jsx';
import Caption from '../../../shared/ui/Caption.jsx';
import LabeledSlider from '../../../shared/ui/LabeledSlider.jsx';

const PAGE_SIZE = 32;
const DEFAULT_COLOR = VTT_COLORS.accent;

export default function MapObjectsPanel({
  busy, layer = 'tokens', onPlace, onPlacementDragStart, onPlacementDragEnd,
}) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [strokeWidth, setStrokeWidth] = useState(DEFAULT_MAP_OBJECT_STROKE);
  const filtered = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return [...new Set(iconNames)]
      .filter((name) => words.every((word) => name.includes(word)))
      .sort(compareText);
  }, [query]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => setPage(1), [query]);
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const placement = (iconKey) => ({
    kind: 'object',
    object: {
      key: iconKey, label: mapObjectLabel(iconKey), color, strokeWidth, layer,
    },
    token: {
      iconKey,
      label: mapObjectLabel(iconKey),
      color,
      iconStrokeWidth: strokeWidth,
      layer,
      rotation: 0,
      w: 1,
      h: 1,
    },
  });

  return (
    <Box>
      <Caption component="p" sx={{ mb: 1 }}>
        Click to quick-place, or drag with mouse, touch or pen onto the {layer} layer.
        {' '}Placed objects can be moved, resized and rotated.
      </Caption>
      <Box sx={filtersSx}>
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Search Lucide icons…"
          ariaLabel="Search Lucide icons"
          sx={{ flex: 1, minWidth: 0 }}
        />
        <ColorField
          label="Object color"
          title="Object color"
          value={color}
          commitOnBlur
          onChange={setColor}
          size={34}
        />
      </Box>

      <LabeledSlider
        label="Stroke"
        valueText={strokeWidth.toFixed(1)}
        ariaLabel="Icon stroke width"
        min={MIN_MAP_OBJECT_STROKE}
        max={MAX_MAP_OBJECT_STROKE}
        step={0.1}
        value={strokeWidth}
        onChange={(value) => setStrokeWidth(Number(value))}
        sx={{ mb: 0.5 }}
      />

      <Typography sx={countSx}>{filtered.length} icons · page {page} of {pageCount}</Typography>
      {visible.length ? (
        <Box sx={gridSx}>
          {visible.map((iconKey) => {
            const label = mapObjectLabel(iconKey);
            return (
              <Box
                key={iconKey}
                component="button"
                type="button"
                aria-label={`Place ${label}`}
                title={label}
                disabled={busy}
                onClick={() => onPlace?.(placement(iconKey).object)}
                onPointerDown={(event) => beginPiecePointerDrag(event, placement(iconKey), {
                  onPlacementDragStart,
                  onPlacementDragEnd,
                })}
                sx={{ ...objectButtonSx, color }}
              >
                <Box data-piece-preview sx={previewSx}>
                  <MapObjectGlyph iconKey={iconKey} strokeWidth={strokeWidth} size={27} />
                </Box>
                <Typography component="span" sx={labelSx}>{label}</Typography>
              </Box>
            );
          })}
        </Box>
      ) : <EmptyLine>No Lucide icon matches this search.</EmptyLine>}

      {pageCount > 1 ? (
        <Pagination
          size="small"
          count={pageCount}
          page={page}
          onChange={(_, value) => setPage(value)}
          siblingCount={0}
          boundaryCount={1}
          sx={paginationSx}
        />
      ) : null}
    </Box>
  );
}

const filtersSx = { display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 };
const countSx = { mb: 0.75, color: VTT_COLORS.textMuted, fontSize: FONT_SIZES.xs };

const gridSx = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  gap: 0.5,
};

const objectButtonSx = {
  ...DRAG_SOURCE_SX,
  minWidth: 0,
  p: 0.5,
  borderRadius: 1,
  border: INK_EDGE,
  // Washed over the panel's own surface, so the tile stays solid.
  ...tintedSurfaceSx(VTT_COLORS.black, { amount: OPACITY.fill, base: VTT_COLORS.surface }),
  '&:hover': {
    ...tintedSurfaceSx(VTT_COLORS.accent, { base: VTT_COLORS.surface }),
    borderColor: vttAlpha(VTT_COLORS.accent, OPACITY.strong),
  },
  '&:disabled': { opacity: OPACITY.edge, cursor: 'default' },
};

const previewSx = {
  height: CONTROL_HEIGHTS.xl,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  filter: `drop-shadow(0 2px 2px ${vttAlpha(VTT_COLORS.black, OPACITY.solid)})`,
};

const labelSx = {
  ...ONE_LINE_SX,
  display: 'block',
  color: VTT_COLORS.text,
  fontSize: FONT_SIZES.xxs,
  lineHeight: LINE_HEIGHTS.tight,
};

const paginationSx = {
  mt: 1,
  display: 'flex',
  justifyContent: 'center',
  '& .MuiPaginationItem-root': { minWidth: 25, height: CONTROL_HEIGHTS.md, fontSize: FONT_SIZES.sm },
};
