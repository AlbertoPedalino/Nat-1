import { useParams, Link } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import { Plus } from 'lucide-react';
import AppTopBar from '../../components/AppTopBar.jsx';
import NotFoundPage from '../notfound/NotFoundPage.jsx';
import { resolveTool } from './logic/tools.js';
import CharacterPicker from './CharacterPicker.jsx';
import SectionPicker from './SectionPicker.jsx';
import * as s from './styles.js';

export default function InstancePickerPage() {
  const { tool } = useParams();
  const meta = resolveTool(tool);

  if (!meta) return <NotFoundPage />;

  return (
    <Box sx={s.rootSx}>
      <AppTopBar home />
      <Box sx={s.headerSx}>
        <Box sx={{ color: meta.color, display: 'flex' }}>
          <meta.icon size={30} strokeWidth={1.5} />
        </Box>
        <Typography sx={s.titleSx}>{meta.label}</Typography>
        <Button component={Link} to={meta.newRoute} variant="contained" startIcon={<Plus size={16} />} sx={s.newBtnSx}>
          New {meta.label}
        </Button>
      </Box>

      {meta.slug === 'characters' ? <CharacterPicker /> : <SectionPicker meta={meta} />}
    </Box>
  );
}
