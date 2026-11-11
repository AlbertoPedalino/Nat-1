import { useState } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { ChevronDown, Eye } from 'lucide-react';
import { passiveScore } from '../../../shared/character/sheet/sheetStats.js';
import { collectSenses } from './visionSenses.js';
import { loadSenseDescriptions, getSenseDescriptionEntries, getFeatureDescriptionEntries } from './senseDescriptions.js';
import { EntryBlocks } from '../../../shared/content/EntryBlocks.jsx';
import CollapsibleBody from '../../../shared/ui/CollapsibleBody.jsx';
import { UI_COLORS, uiAlpha, OPACITY } from '../../../shared/ui/colors.js';
import { FONT_SIZES, LINE_HEIGHTS } from '../../../shared/ui/fonts.js';
import PanelHeader, { panelFrameSx } from '../../../shared/ui/PanelHeader.jsx';
import { useLoaded } from '../../../shared/ui/useLoaded.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { SURFACES } from '../../../shared/ui/surfaces.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';

export default function Senses({ C }) {
  const passPerc = passiveScore(C, 'Perception');
  const passInv = passiveScore(C, 'Investigation');
  const passIns = passiveScore(C, 'Insight');
  const { vision: visionRows, other: otherRows } = collectSenses(C);
  const [expanded, setExpanded] = useState(null);
  // Live rules text from 5etools (same source as spells/items): the rows redraw
  // once it is in.
  useLoaded(loadSenseDescriptions);
  const toggle = (key) => setExpanded((cur) => (cur === key ? null : key));

  const renderRow = (key, value, row) => {
    // Live rules text: generic sense first, then the granting feature, then note.
    const entries = getSenseDescriptionEntries(row.type) || getFeatureDescriptionEntries(row.featureName);
    return (
      <SenseRow
        key={key}
        value={value}
        label={row.label}
        source={row.source}
        entries={entries}
        note={entries ? null : row.note}
        expanded={expanded === key}
        onToggle={() => toggle(key)}
        color="secondary.main"
      />
    );
  };

  return (
    <Paper variant="outlined" sx={{ ...panelFrameSx, mb: '0.6rem' }}>
      <PanelHeader icon={Eye} title="Senses" tone={UI_COLORS.info} />
      <Box sx={{ p: '0.55rem 0.8rem' }}>
        <SenseRow value={passPerc} label="Passive Perception" />
        <SenseRow value={passInv} label="Passive Investigation" />
        <SenseRow value={passIns} label="Passive Insight" />
        {visionRows.map((row) => renderRow(`vision-${row.type}`, `${row.range} ft`, row))}
        {otherRows.map((row) => renderRow(row.key, row.value, row))}
      </Box>
    </Paper>
  );
}

function SenseRow({ value, label, source, color, entries, note, expanded, onToggle }) {
  const clickable = !!(entries?.length || note);
  return (
    <Box sx={{ ...SURFACES.panel, mb: 0.25, overflow: 'hidden' }}>
      <Box
        onClick={clickable ? onToggle : undefined}
        sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, px: 1, py: 0.25,
          cursor: clickable ? 'pointer' : 'default',
          '&:hover': clickable ? { bgcolor: uiAlpha(UI_COLORS.accent, OPACITY.wash) } : undefined,
        }}
      >
        <Typography sx={{ ...TEXT_STYLES.figure, fontSize: FONT_SIZES.lead, color: color || UI_COLORS.accentText, flexShrink: 0 }}>
          {value}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 0 }}>
            <Typography sx={{ fontSize: FONT_SIZES.md, color: 'text.secondary', textAlign: 'right', lineHeight: LINE_HEIGHTS.tight }}>{label}</Typography>
            {source ? (
              <Typography sx={{ ...TEXT_STYLES.note, fontSize: FONT_SIZES.xxs, opacity: OPACITY.heavy, textAlign: 'right', lineHeight: LINE_HEIGHTS.tight }}>
                {source}
              </Typography>
            ) : null}
          </Box>
          {clickable ? (
            <ChevronDown
              size={ICON_SIZES.xs}
              style={{ color: UI_COLORS.accent, flexShrink: 0, opacity: OPACITY.heavy, transition: 'transform 0.15s', transform: expanded ? 'rotate(180deg)' : 'none' }}
            />
          ) : null}
        </Box>
      </Box>
      {clickable ? (
        <CollapsibleBody open={expanded}>
          <Box sx={{
            px: 1, pb: 0.5, pt: 0.25,
            // Scale 5etools EntryBlocks (body2) down to the compact panel size.
            '& .MuiTypography-root': { fontSize: FONT_SIZES.xs, lineHeight: LINE_HEIGHTS.normal },
            '& th, & td': { fontSize: FONT_SIZES.xs },
          }}>
            {entries?.length ? (
              <EntryBlocks entries={entries} spacing={0.5} emptyText="" />
            ) : (
              <Typography sx={{ fontSize: FONT_SIZES.xs, color: 'text.secondary', lineHeight: LINE_HEIGHTS.normal }}>{note}</Typography>
            )}
          </Box>
        </CollapsibleBody>
      ) : null}
    </Box>
  );
}
