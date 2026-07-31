import { Box, Paper, Typography } from '@mui/material';
import { ScrollText } from 'lucide-react';
import { collectAllProficiencies } from '../logic/proficiencies.js';
import { useProficiencySets } from '../context/ProficiencySetsContext.jsx';

export default function Proficiencies({ C }) {
  const profSets = useProficiencySets();
  const sections = collectAllProficiencies(C, profSets);
  return (
    <Paper variant="outlined" sx={{ mb: '0.6rem', overflow: 'hidden' }}>
      <Box sx={{ bgcolor: 'rgba(35,32,26,1)', borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1, px: '0.8rem', py: '0.48rem', borderLeft: 3, borderLeftColor: 'primary.main' }}>
        <ScrollText size={14} />
        <Typography sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'primary.main' }}>
          Proficiencies
        </Typography>
      </Box>
      <Box sx={{ p: '0.55rem 0.8rem' }}>
        {sections.length === 0 && (
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', fontStyle: 'italic' }}>No proficiencies loaded.</Typography>
        )}
        {sections.map(sec => (
          <Box key={sec.title} sx={{ mb: '0.7rem' }}>
            <Typography sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'text.secondary', mb: 0.25 }}>
              {sec.title}
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', lineHeight: 1.5 }}>
              {sec.items.join(', ')}
            </Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}
