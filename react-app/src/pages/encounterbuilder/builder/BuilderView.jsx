import { Box, Stack } from '@mui/material';
import CampaignImport from '../campaign/CampaignImport.jsx';
import EncounterList from './EncounterList.jsx';
import MonsterList from '../bestiary/MonsterList.jsx';
import PartyConfig from './PartyConfig.jsx';
import { Mark } from '../RenderClock.jsx';

export default function BuilderView() {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0,1.35fr) minmax(360px,0.9fr)' }, gap: 2 }}>
      <Mark at="monsters" />
      <MonsterList />
      <Stack spacing={2}>
        <Mark at="encounter" />
        <EncounterList />
        <Mark at="party" />
        <PartyConfig />
        <Mark at="campaign" />
        <CampaignImport />
        <Mark at="builder-end" />
      </Stack>
    </Box>
  );
}
