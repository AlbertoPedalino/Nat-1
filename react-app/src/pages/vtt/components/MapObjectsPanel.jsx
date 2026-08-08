import { useEffect, useMemo, useRef, useState } from 'react';
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
} from '../../../shared/vtt/mapObjects.js';
import { beginPieceDrag } from './PiecePreview.jsx';
import MapObjectGlyph from './MapObjectGlyph.jsx';

const PAGE_SIZE = 32;
const DEFAULT_COLOR = VTT_COLORS.gold;

export default function MapObjectsPanel({
  busy, layer = 'tokens', onPlace, onPlacementDragStart, onPlacementDragEnd,
}) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [strokeWidth, setStrokeWidth] = useState(DEFAULT_MAP_OBJECT_STROKE);
  const colorRef = useRef(DEFAULT_COLOR);
  const filtered = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return [...new Set(iconNames)]
      .filter((name) => words.every((word) => name.includes(word)))
      .sort((a, b) => a.localeCompare(b));
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
      key: iconKey, label: mapObjectLabel(iconKey), color: colorRef.current, strokeWidth, layer,
    },
    token: {
      iconKey,
      label: mapObjectLabel(iconKey),
      color: colorRef.current,
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
        Click or drag an icon onto the {layer} layer. Placed objects can be moved, resized and rotated.
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
              startAdornment: <InputAdornment position="start"><Search size={14} /></InputAdornment>,
            },
          }}
          sx={{ flex: 1, minWidth: 0 }}
        />
        <Box
          component="input"
          type="color"
          aria-label="Object color"
          title="Object color"
          defaultValue={DEFAULT_COLOR}
          onInput={(event) => { colorRef.current = event.currentTarget.value; }}
          onBlur={() => setColor(colorRef.current)}
          sx={colorInputSx}
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
                draggable={!busy}
                disabled={busy}
                onClick={() => onPlace?.(placement(iconKey).object)}
                onDragStart={(event) => {
                  beginPieceDrag(event);
                  onPlacementDragStart?.(placement(iconKey));
                }}
                onDragEnd={onPlacementDragEnd}
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
      ) : <Typography sx={emptySx}>No Lucide icon matches this search.</Typography>}

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

const hintSx = { mb: 1, color: VTT_COLORS.panelTextMuted, fontSize: '0.72rem', lineHeight: 1.45 };
const filtersSx = { display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.6 };
const countSx = { mb: 0.7, color: VTT_COLORS.panelTextFaint, fontSize: '0.6rem' };
const strokeControlSx = {
  display: 'grid',
  gridTemplateColumns: '42px minmax(0, 1fr) 26px',
  alignItems: 'center',
  gap: 0.7,
  mb: 0.55,
};
const strokeLabelSx = { color: VTT_COLORS.panelText, fontSize: '0.65rem' };
const strokeSliderSx = { py: 0.6, color: VTT_COLORS.gold };
const strokeValueSx = { color: VTT_COLORS.panelTextMuted, fontSize: '0.62rem', textAlign: 'right' };

const colorInputSx = {
  width: 34,
  height: 34,
  flexShrink: 0,
  p: '2px',
  border: `1px solid ${vttAlpha(VTT_COLORS.gold, 0.42)}`,
  borderRadius: 1,
  bgcolor: vttAlpha(VTT_COLORS.black, 0.3),
  cursor: 'pointer',
};

const gridSx = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  gap: 0.6,
};

const objectButtonSx = {
  minWidth: 0,
  p: 0.55,
  borderRadius: 1,
  border: `1px solid ${vttAlpha(VTT_COLORS.gold, 0.24)}`,
  bgcolor: vttAlpha(VTT_COLORS.black, 0.18),
  cursor: 'grab',
  '&:hover': {
    bgcolor: vttAlpha(VTT_COLORS.gold, 0.1),
    borderColor: vttAlpha(VTT_COLORS.gold, 0.6),
  },
  '&:disabled': { opacity: 0.45, cursor: 'default' },
};

const previewSx = {
  height: 32,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  filter: `drop-shadow(0 2px 2px ${vttAlpha(VTT_COLORS.black, 0.9)})`,
};

const labelSx = {
  display: 'block',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  color: VTT_COLORS.panelText,
  fontSize: '0.58rem',
  lineHeight: 1.2,
};

const emptySx = { py: 3, textAlign: 'center', color: VTT_COLORS.panelTextFaint, fontSize: '0.72rem' };
const paginationSx = {
  mt: 1,
  display: 'flex',
  justifyContent: 'center',
  '& .MuiPaginationItem-root': { minWidth: 25, height: 25, fontSize: '0.65rem' },
};
