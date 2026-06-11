import { Box, Card, CardContent, Chip, Paper, Stack, Typography } from '@mui/material';
import { GraduationCap } from 'lucide-react';
import { renderEntries } from '../logic/renderEntries.js';
import { ENTITY_COLORS } from '../../../shared/entityColors.js';

const BG = ENTITY_COLORS.background;

function listProficiencies(arr) {
  if (!arr || !arr.length) return null;
  const items = [];
  arr.forEach(entry => {
    if (typeof entry === 'string') { items.push(entry); return; }
    if (typeof entry === 'object') {
      Object.keys(entry).forEach(k => {
        if (k === 'choose' || k === 'any' || k === 'anyStandard' || k === 'anyExotic' || k === 'anyTool' || k === 'anyArtisansTool' || k === 'anyMusicalInstrument') return;
        items.push(k);
      });
      if (entry.choose?.from?.length) {
        entry.choose.from.forEach(f => items.push(`Choose: ${f}`));
      }
    }
  });
  return items.length ? items : null;
}

function listFeats(feats) {
  if (!feats || !feats.length) return null;
  const items = [];
  feats.forEach(f => {
    if (typeof f === 'string') { items.push(f); return; }
    if (typeof f === 'object') {
      const fixed = Object.keys(f).find(k => k !== 'choose' && f[k]);
      if (fixed) items.push(fixed.split('|')[0]);
      if (f.choose?.from?.length) items.push(`Choose: ${f.choose.from[0].split('|')[0]}`);
    }
  });
  return items.length ? items : null;
}

function renderEquipment(eq) {
  if (!eq) return [];
  if (typeof eq === 'string') return [eq];
  if (Array.isArray(eq)) {
    return eq.flatMap(e => {
      if (typeof e === 'string') return [e];
      if (e.item) return [e.quantity ? `${e.quantity}x ${e.item}` : e.item];
      if (e.special) return e.special;
      if (e.choose) return e.choose.from?.slice(0, 3).map(f => `Choose: ${f}`) || [];
      return [];
    });
  }
  if (typeof eq === 'object') {
    if (eq.special) return eq.special;
    if (eq.item) return [eq.quantity ? `${eq.quantity}x ${eq.item}` : eq.item];
    const items = [];
    Object.keys(eq).forEach(k => {
      if (k === 'special' || k === '_' || k === '$') return;
      const v = eq[k];
      if (Array.isArray(v)) {
        v.forEach(e => {
          if (e.item) items.push(e.quantity ? `${e.quantity}x ${e.item}` : e.item);
          else if (e.special) items.push(...e.special);
          else if (typeof e === 'string') items.push(e);
        });
      } else if (typeof v === 'number' && v > 0) {
        items.push(`${v}x ${k}`);
      } else if (typeof v === 'object' && v.item) {
        items.push(v.quantity ? `${v.quantity}x ${v.item}` : v.item);
      }
    });
    return items;
  }
  return [];
}

function ProfList({ title, items }) {
  if (!items || !items.length) return null;
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" sx={{ color: BG, fontWeight: 700, letterSpacing: 0.5, mb: 0.2, display: 'block' }}>
        {title}
      </Typography>
      <Box component="ul" sx={{ m: 0, pl: 2, color: 'text.secondary', fontSize: '0.75rem' }}>
        {items.map((item) => (
          <Typography key={item} component="li" variant="caption" sx={{ color: 'text.secondary', mb: 0.1 }}>
            {item.charAt(0).toUpperCase() + item.slice(1)}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}

export default function BackgroundTab({ C }) {
  const background = C?.backgroundSnapshot || {};
  const backgroundName = C?.backgroundName || '';
  const backgroundSource = C?.backgroundSource || '';
  const entries = background.entries || [];
  const description = entries.length ? renderEntries(entries) : '';

  const skills = listProficiencies(background.skillProficiencies);
  const tools = listProficiencies(background.toolProficiencies);
  const languages = listProficiencies(background.languageProficiencies);
  const feats = listFeats(background.feats);
  const equipment = renderEquipment(background.startingEquipment);

  return (
    <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'rgba(35,32,26,1)', overflow: 'hidden' }}>
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1, pb: 0.5, borderBottom: 1, borderColor: 'rgba(237,212,138,0.22)' }}>
        <GraduationCap size={16} color={BG} />
        <Typography variant="overline" sx={{ letterSpacing: 1, color: BG, fontWeight: 700 }}>
          Background — {backgroundName || '?'}
        </Typography>
        {backgroundSource ? (
          <Chip size="small" label={backgroundSource} variant="outlined"
            sx={{ color: BG, borderColor: BG, fontWeight: 700, fontSize: '0.5rem', height: 18, '& .MuiChip-label': { color: BG } }} />
        ) : null}
      </Stack>

      {entries.length > 0 && (
        <Card variant="outlined" sx={{ minWidth: 0, borderLeft: `3px solid ${BG}`, mb: 0.75 }}>
          <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
            <Typography variant="caption" sx={{ color: BG, fontWeight: 700, mb: 0.3, display: 'block' }}>
              Description
            </Typography>
            <Box sx={{
              color: 'text.secondary', fontSize: '0.75rem', lineHeight: 1.45, wordBreak: 'break-word',
              whiteSpace: 'pre-line',
              '& b': { color: 'text.primary', fontWeight: 700 },
              '& i': { color: 'text.secondary' },
              '& ul': { my: 0.35 },
              '& li': { mb: 0.2 },
            }}>
              {description}
            </Box>
          </CardContent>
        </Card>
      )}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
        <ProfList title="Skill Proficiencies" items={skills} />
        <ProfList title="Tool Proficiencies" items={tools} />
        <ProfList title="Languages" items={languages} />
        {feats ? <ProfList title="Origin Feat" items={feats} /> : null}
      </Box>

      {equipment.length > 0 && (
        <Box sx={{ mt: 0.75, pt: 0.5, borderTop: 1, borderColor: 'rgba(237,212,138,0.22)' }}>
          <Typography variant="caption" sx={{ color: BG, fontWeight: 700, letterSpacing: 0.5, mb: 0.2, display: 'block' }}>
            Starting Equipment
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.3 }}>
            {equipment.map((item, i) => (
              <Chip key={i} size="small" label={item} variant="outlined"
                sx={{ fontSize: '0.6rem', color: 'text.secondary', borderColor: 'divider' }} />
            ))}
          </Box>
        </Box>
      )}

      {!entries.length && !skills && !tools && !languages && !feats && !equipment.length && (
        <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', fontStyle: 'italic' }}>
          No background details available.
        </Typography>
      )}
    </Paper>
  );
}
