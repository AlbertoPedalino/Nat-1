import { useEffect, useState } from 'react';
import { Box, Collapse, Paper, Typography } from '@mui/material';
import { ChevronDown, Eye } from 'lucide-react';
import { getSkillBonus } from '../logic/calculations.js';
import { collectSenses } from '../logic/visionSenses.js';
import { loadSenseDescriptions, getSenseDescriptionEntries, getFeatureDescriptionEntries } from '../logic/senseDescriptions.js';
import { EntryBlocks } from '../../../shared/character/EntryBlocks.jsx';

export default function Senses({ C }) {
  const passPerc = 10 + getSkillBonus(C, { n: 'Perception', a: 'wis' });
  const passInv = 10 + getSkillBonus(C, { n: 'Investigation', a: 'int' });
  const passIns = 10 + getSkillBonus(C, { n: 'Insight', a: 'wis' });
  const { vision: visionRows, other: otherRows } = collectSenses(C);
  const [expanded, setExpanded] = useState(null);
  const [, setDescLoaded] = useState(false);
  const toggle = (key) => setExpanded((cur) => (cur === key ? null : key));

  // Live rules text from 5etools (same source as spells/items), loaded once.
  useEffect(() => {
    let alive = true;
    loadSenseDescriptions().then(() => { if (alive) setDescLoaded(true); }).catch(() => {});
    return () => { alive = false; };
  }, []);

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
    <Paper variant="outlined" sx={{ mb: '0.6rem', overflow: 'hidden' }}>
      <Box sx={{ bgcolor: 'rgba(35,32,26,1)', borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1, px: '0.8rem', py: '0.48rem', borderLeft: 3, borderLeftColor: 'primary.main' }}>
        <Eye size={14} />
        <Typography sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'primary.main' }}>
          Senses
        </Typography>
      </Box>
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
    <Box sx={{ bgcolor: 'rgba(35,32,26,1)', border: 1, borderColor: 'divider', borderRadius: 1, mb: 0.2, overflow: 'hidden' }}>
      <Box
        onClick={clickable ? onToggle : undefined}
        sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, px: 1, py: 0.25,
          cursor: clickable ? 'pointer' : 'default',
          '&:hover': clickable ? { bgcolor: 'rgba(202,165,80,0.05)' } : undefined,
        }}
      >
        <Typography sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '1.15rem', fontWeight: 700, color: color || '#edd48a', flexShrink: 0 }}>
          {value}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, minWidth: 0 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 0 }}>
            <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', textAlign: 'right', lineHeight: 1.2 }}>{label}</Typography>
            {source ? (
              <Typography sx={{ fontSize: '0.56rem', color: 'text.secondary', fontStyle: 'italic', opacity: 0.7, textAlign: 'right', lineHeight: 1.2 }}>
                {source}
              </Typography>
            ) : null}
          </Box>
          {clickable ? (
            <ChevronDown
              size={13}
              style={{ color: '#caa550', flexShrink: 0, opacity: 0.7, transition: 'transform 0.15s', transform: expanded ? 'rotate(180deg)' : 'none' }}
            />
          ) : null}
        </Box>
      </Box>
      {clickable ? (
        <Collapse in={expanded} unmountOnExit>
          <Box sx={{
            px: 1, pb: 0.6, pt: 0.1,
            // Scale 5etools EntryBlocks (body2) down to the compact panel size.
            '& .MuiTypography-root': { fontSize: '0.62rem', lineHeight: 1.45 },
            '& th, & td': { fontSize: '0.62rem' },
          }}>
            {entries?.length ? (
              <EntryBlocks entries={entries} spacing={0.4} emptyText="" />
            ) : (
              <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary', lineHeight: 1.45 }}>{note}</Typography>
            )}
          </Box>
        </Collapse>
      ) : null}
    </Box>
  );
}
