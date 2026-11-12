import { useEffect, useMemo, useState } from 'react';
import {
  Box, InputAdornment, Pagination, Slider, TextField, Typography,
} from '@mui/material';
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
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import { CONTROL_HEIGHTS } from '../../../shared/ui/controlHeights.js';
import { INK_EDGE } from '../../../shared/ui/shadows.js';
import EmptyLine from '../../../shared/ui/EmptyLine.jsx';

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
      <Typography sx={hintSx}>
        Click to quick-place, or drag with mouse, touch or pen onto the {layer} layer.
        {' '}Placed objects can be moved, resized and rotated.
      </Typography>
      <Box sx={filtersSx}>
        <TextField
          size="small"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search Lucide icons…"
          slotProps={{
            htmlInput: { 'aria-label': 'Search Lucide icons' },
            input: {
              startAdornment: <InputAdornment position="start"><Search size={ICON_SIZES.sm} /></InputAdornment>,
            },
          }}
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

      <Box sx={strokeControlSx}>
        <Typography sx={strokeLabelSx}>Stroke</Typography>
        <Slider
          size="small"
          aria-label="Icon stroke width"
          min={MIN_MAP_OBJECT_STROKE}
          max={MAX_MAP_OBJECT_STROKE}
          step={0.1}
          value={strokeWidth}
          valueLabelDisplay="auto"
          onChange={(_, value) => setStrokeWidth(Number(value))}
          sx={strokeSliderSx}
        />
        <Typography sx={strokeValueSx}>{strokeWidth.toFixed(1)}</Typography>
      </Box>

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

const hintSx = { mb: 1, color: VTT_COLORS.textSecondary, fontSize: FONT_SIZES.md, lineHeight: LINE_HEIGHTS.normal };
const filtersSx = { display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 };
const countSx = { mb: 0.75, color: VTT_COLORS.textMuted, fontSize: FONT_SIZES.xs };
const strokeControlSx = {
  display: 'grid',
  gridTemplateColumns: '42px minmax(0, 1fr) 26px',
  alignItems: 'center',
  gap: 0.75,
  mb: 0.5,
};
const strokeLabelSx = { color: VTT_COLORS.text, fontSize: FONT_SIZES.sm };
const strokeSliderSx = { py: 0.5, color: VTT_COLORS.accent };
const strokeValueSx = { color: VTT_COLORS.textSecondary, fontSize: FONT_SIZES.xs, textAlign: 'right' };

const gridSx = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  gap: 0.5,
};

const objectButtonSx = {
  minWidth: 0,
  p: 0.5,
  borderRadius: 1,
  border: INK_EDGE,
  bgcolor: vttAlpha(VTT_COLORS.black, OPACITY.fill),
  cursor: 'grab',
  touchAction: 'pan-y',
  WebkitTouchCallout: 'none',
  userSelect: 'none',
  '&:hover': {
    bgcolor: vttAlpha(VTT_COLORS.accent, OPACITY.tint),
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
  display: 'block',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
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
