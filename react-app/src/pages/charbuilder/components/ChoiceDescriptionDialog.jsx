import { Typography } from '@mui/material';
import { Info } from 'lucide-react';
import SheetDialog from '../../../shared/character/SheetDialog.jsx';

export default function ChoiceDescriptionDialog({ value, onClose }) {
  return (
    <SheetDialog
      open={!!value}
      onClose={onClose}
      maxWidth="sm"
      title={value?.title || 'Choice'}
      icon={<Info size={20} />}
      showClose
    >
      <Typography color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
        {value?.body || ''}
      </Typography>
    </SheetDialog>
  );
}
