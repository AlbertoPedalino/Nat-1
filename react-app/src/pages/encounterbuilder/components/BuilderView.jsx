import { Box, Stack } from '@mui/material';
import CampaignImport from './CampaignImport.jsx';
import EncounterList from './EncounterList.jsx';
import MonsterList from './MonsterList.jsx';
import PartyConfig from './PartyConfig.jsx';

export default function BuilderView() {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0,1.35fr) minmax(360px,0.9fr)' }, gap: 2 }}>
      <MonsterList />
      <Stack spacing={2}>
        <EncounterList />
        <PartyConfig />
        <CampaignImport />
      </Stack>
    </Box>
  );
}
