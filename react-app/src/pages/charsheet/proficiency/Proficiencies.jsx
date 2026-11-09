import { Box, Paper, Typography } from '@mui/material';
import { ScrollText } from 'lucide-react';
import { collectAllProficiencies } from '../../../shared/character/proficiency/allProficiencies.js';
import { useProficiencySets } from './ProficiencySetsContext.jsx';
import PanelHeader, { sectionLabelSx } from '../../../shared/ui/PanelHeader.jsx';
import { emptyTextSx } from '../../../shared/ui/PanelHeader.jsx';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';

export default function Proficiencies({ C }) {
  const profSets = useProficiencySets();
  const sections = collectAllProficiencies(C, profSets);
  return (
    <Paper variant="outlined" sx={{ mb: '0.6rem', overflow: 'hidden' }}>
      <PanelHeader icon={ScrollText} title="Proficiencies" />
      <Box sx={{ p: '0.55rem 0.8rem' }}>
        {sections.length === 0 && (
          <Typography sx={emptyTextSx}>No proficiencies loaded.</Typography>
        )}
        {sections.map(sec => (
          <Box key={sec.title} sx={{ mb: '0.7rem' }}>
            <Typography sx={{ ...sectionLabelSx, color: 'text.secondary', mb: 0.25 }}>
              {sec.title}
            </Typography>
            <Typography sx={{ fontSize: FONT_SIZES.lg, color: 'text.secondary', lineHeight: 1.5 }}>
              {sec.items.join(', ')}
            </Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}
