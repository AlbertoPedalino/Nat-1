import { Box, Typography } from '@mui/material';
import { collectAllProficiencies } from '../../../shared/character/proficiency/allProficiencies.js';
import { useProficiencySets } from './ProficiencySetsContext.jsx';
import PanelHeader, { sectionLabelSx } from '../../../shared/ui/PanelHeader.jsx';
import { emptyTextSx } from '../../../shared/ui/PanelHeader.jsx';
import { FONT_SIZES, LINE_HEIGHTS } from '../../../shared/ui/fonts.js';
import { PANEL_TONES } from '../../../shared/ui/entityColors.js';
import { GAME_ICONS } from '../../../shared/ui/gameIcons.js';
import Panel from '../../../shared/ui/Panel.jsx';

export default function Proficiencies({ C }) {
  const profSets = useProficiencySets();
  const sections = collectAllProficiencies(C, profSets);
  return (
    <Panel icon={GAME_ICONS.proficiencies} title="Proficiencies" tone={PANEL_TONES.proficiencies} sx={{ mb: '0.6rem' }} bodySx={{}}>
      <Box sx={{ p: '0.55rem 0.8rem' }}>
        {sections.length === 0 && (
          <Typography sx={emptyTextSx}>No proficiencies loaded.</Typography>
        )}
        {sections.map(sec => (
          <Box key={sec.title} sx={{ mb: '0.7rem' }}>
            <Typography sx={{ ...sectionLabelSx, color: 'text.secondary', mb: 0.25 }}>
              {sec.title}
            </Typography>
            <Typography sx={{ fontSize: FONT_SIZES.lg, color: 'text.secondary', lineHeight: LINE_HEIGHTS.normal }}>
              {sec.items.join(', ')}
            </Typography>
          </Box>
        ))}
      </Box>
    </Panel>
  );
}
