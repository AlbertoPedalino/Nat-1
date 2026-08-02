import { useParams, useNavigate, Link } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import { Plus } from 'lucide-react';
import AppTopBar from '../../components/AppTopBar.jsx';
import NotFoundPage from '../notfound/NotFoundPage.jsx';
import { createSectionInstance } from '../../shared/sectionInstances.js';
import { useToast } from '../../shared/ToastProvider.jsx';
import { resolveTool } from './logic/tools.js';
import CharacterPicker from './CharacterPicker.jsx';
import SectionPicker from './SectionPicker.jsx';
import * as s from './styles.js';

export default function InstancePickerPage() {
  const { tool } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const meta = resolveTool(tool);

  if (!meta) return <NotFoundPage />;

  // Section tools save the new instance here, then open it by id: the tool page
  // never shows an unsaved draft. Characters keep their own builder flow.
  const handleNew = () => {
    const entry = createSectionInstance(meta.sectionKey);
    if (!entry) {
      notify('error', `${meta.label} could not be saved on this device.`);
      return;
    }
    navigate(meta.route(entry.id));
  };

  const newButtonProps = meta.sectionKey
    ? { onClick: handleNew }
    : { component: Link, to: meta.newRoute };

  return (
    <Box sx={s.rootSx}>
      <AppTopBar home />
      <Box sx={s.headerSx}>
        <Box sx={{ color: meta.color, display: 'flex' }}>
          <meta.icon size={30} strokeWidth={1.5} />
        </Box>
        <Typography sx={s.titleSx}>{meta.label}</Typography>
        <Button {...newButtonProps} variant="contained" startIcon={<Plus size={16} />} sx={s.newBtnSx}>
          New {meta.label}
        </Button>
      </Box>

      {meta.slug === 'characters' ? <CharacterPicker /> : <SectionPicker meta={meta} />}
    </Box>
  );
}
