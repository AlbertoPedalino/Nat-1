import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@mui/material';
import { Plus } from 'lucide-react';
import AppPage from '../../app/navigation/AppPage.jsx';
import NotFoundPage from '../notfound/NotFoundPage.jsx';
import { createInstance } from '../../shared/instances/instanceStore.js';
import { useToast } from '../../shared/ui/ToastProvider.jsx';
import PageHeader from '../../shared/ui/PageHeader.jsx';
import { resolveTool } from './logic/tools.js';
import CharacterPicker from './CharacterPicker.jsx';
import SectionPicker from './SectionPicker.jsx';
import * as s from './styles.js';
import { ICON_SIZES } from '../../shared/ui/iconSizes.js';

export default function InstancePickerPage() {
  const { tool } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const meta = resolveTool(tool);

  if (!meta) return <NotFoundPage />;

  // Section tools save the new instance here, then open it by id: the tool page
  // never shows an unsaved draft. Characters keep their own builder flow.
  const handleNew = () => {
    const entry = createInstance(meta.sectionKey);
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
    <AppPage topBar={{ home: true }} maxWidth={640}>
      <PageHeader
        icon={meta.icon}
        iconColor={meta.color}
        title={meta.label}
        actions={(
          <Button {...newButtonProps} variant="contained" startIcon={<Plus size={ICON_SIZES.md} />} sx={s.newBtnSx}>
            New {meta.label}
          </Button>
        )}
      />

      {meta.slug === 'characters' ? <CharacterPicker /> : <SectionPicker meta={meta} />}
    </AppPage>
  );
}
