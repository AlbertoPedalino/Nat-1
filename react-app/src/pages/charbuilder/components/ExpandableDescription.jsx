import { useState } from 'react';
import { Box, Button, Collapse, Typography } from '@mui/material';
import { renderEntryText, cleanText } from '../logic/text.js';
// Gold accent for entry/section titles so they stand apart from the beige body text.
import { NEUTRAL_TONE as TITLE_COLOR } from '../../../shared/entityColors.js';

// Render a single 5etools entry node (string, list, item, nested entries…) into
// MUI elements. Shared by the builder choice panels (Fighting Style, Eldritch
// Invocations) so live 2024 descriptions render with the same rich formatting.
export function renderEntryNode(entry, key) {
  if (entry == null) return null;
  if (typeof entry === 'string' || typeof entry === 'number') {
    return <Typography key={key} variant="body2" color="text.secondary" sx={{ mb: 0.25 }}>{cleanText(String(entry))}</Typography>;
  }
  if (Array.isArray(entry)) {
    return entry.map((e, i) => renderEntryNode(e, `${key}-${i}`));
  }
  if (typeof entry !== 'object') return null;
  const k = key;
  if (entry.type === 'list' && Array.isArray(entry.items)) {
    return entry.items.map((item, i) => renderEntryNode(item, `${k}-item-${i}`));
  }
  if (entry.type === 'item' && entry.name && entry.entry != null) {
    return (
      <Box key={k} sx={{ mb: 0.25 }}>
        <Box component="span" sx={{ fontWeight: 700, color: TITLE_COLOR }}>{entry.name}</Box>
        <Box component="span" sx={{ color: 'text.secondary' }}>
          {typeof entry.entry === 'string' ? ` ${cleanText(entry.entry)}` : renderEntryNode(entry.entry, `${k}-val`)}
        </Box>
      </Box>
    );
  }
  if (entry.type === 'item' && entry.entry != null) {
    return <Box key={k} sx={{ mb: 0.25, color: 'text.secondary' }}>{typeof entry.entry === 'string' ? cleanText(entry.entry) : renderEntryNode(entry.entry, `${k}-val`)}</Box>;
  }
  if (entry.type === 'entries' || entry.name) {
    return (
      <Box key={k} sx={{ mb: 0.5 }}>
        {entry.name ? <Typography variant="body2" sx={{ fontWeight: 700, color: TITLE_COLOR, mb: 0.15 }}>{entry.name}</Typography> : null}
        {entry.entries ? renderEntryNode(entry.entries, `${k}-body`) : null}
      </Box>
    );
  }
  if (entry.entries) return <Box key={k} sx={{ mb: 0.25 }}>{renderEntryNode(entry.entries, `${k}-body`)}</Box>;
  if (entry.entry) return <Box key={k} sx={{ mb: 0.25 }}>{renderEntryNode(entry.entry, `${k}-val`)}</Box>;
  if (entry.items) return <Box key={k} sx={{ mb: 0.25 }}>{renderEntryNode(entry.items, `${k}-items`)}</Box>;
  return null;
}

// Render full 5etools entries with no clamp/toggle. For inline use where an outer
// control (e.g. a per-row expand chevron) already gates visibility. Accepts an
// entries array/object or a plain description string.
export function FullDescription({ entries }) {
  const arr = Array.isArray(entries) ? entries : (entries ? [entries] : []);
  const rendered = arr.flatMap((e, i) => renderEntryNode(e, `e${i}`)).filter(Boolean);
  if (!rendered.length) return null;
  return <Box sx={{ minWidth: 0 }}>{rendered}</Box>;
}

// Clamped description with a "Show more" toggle. Used for the selected-feat
// summary; `simpleText` renders a plain-text variant with colon-bolded labels.
export function ExpandableDescription({ entries, initialClamp = 3, simpleText }) {
  const [open, setOpen] = useState(false);
  if (simpleText != null) {
    const isLong = simpleText.length > 250;
    const lines = simpleText.split('\n').filter(Boolean);
    return (
      <Box sx={{ minWidth: 0 }}>
        <Collapse in={open} collapsedSize={initialClamp * 24}>
          <Typography variant="body2" color="text.secondary" component="div" sx={{ overflow: 'hidden' }}>
            {lines.slice(0, open ? lines.length : initialClamp).map((line, i) => {
              const colonIdx = line.indexOf(':');
              if (colonIdx > 0) return (
                <Box key={i} sx={{ mb: 0.25 }}>
                  <Box component="span" sx={{ fontWeight: 700, color: TITLE_COLOR }}>{line.slice(0, colonIdx + 1)}</Box>
                  <Box component="span">{line.slice(colonIdx + 1)}</Box>
                </Box>
              );
              return <Box key={i} sx={{ mb: 0.25 }}>{line}</Box>;
            })}
            {!open && lines.length > initialClamp ? <Box sx={{ color: 'text.disabled', fontStyle: 'italic' }}>...</Box> : null}
          </Typography>
        </Collapse>
        {isLong ? (
          <Button size="small" onClick={() => setOpen(!open)}
            sx={{ mt: 0.25, fontSize: '0.7rem', minWidth: 0, px: 0.5, color: 'primary.light', textTransform: 'none' }}>
            {open ? 'Show less' : 'Show more'}
          </Button>
        ) : null}
      </Box>
    );
  }
  const arr = Array.isArray(entries) ? entries : (entries ? [entries] : []);
  const rendered = arr.flatMap((e, i) => renderEntryNode(e, `e${i}`)).filter(Boolean);
  const totalText = renderEntryText(entries);
  const isLong = rendered.length > initialClamp || totalText.length > 250;
  const visible = open ? rendered : rendered.slice(0, initialClamp);
  return (
    <Box sx={{ minWidth: 0 }}>
      <Collapse in={open} collapsedSize={initialClamp * 24}>
        {visible}
        {!open && rendered.length > initialClamp ? <Box sx={{ color: 'text.disabled', fontStyle: 'italic', mt: 0.25 }}>...</Box> : null}
      </Collapse>
      {isLong ? (
        <Button size="small" onClick={() => setOpen(!open)}
          sx={{ mt: 0.25, fontSize: '0.7rem', minWidth: 0, px: 0.5, color: 'primary.light', textTransform: 'none' }}>
          {open ? 'Show less' : 'Show more'}
        </Button>
      ) : null}
    </Box>
  );
}
