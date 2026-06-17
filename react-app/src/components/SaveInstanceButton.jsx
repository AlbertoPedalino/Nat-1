import { Button, Tooltip } from '@mui/material';
import { Save } from 'lucide-react';

export default function SaveInstanceButton({ saved, onClick, buttonSx }) {
  return (
    <Tooltip title={saved ? 'This instance is saved locally.' : 'Save this instance locally so it appears on the Home page.'}>
      <span>
        <Button
          size="small"
          variant={saved ? 'outlined' : 'contained'}
          color={saved ? 'success' : 'primary'}
          startIcon={<Save size={14} />}
          disabled={saved}
          onClick={onClick}
          sx={{
            fontFamily: '"Cinzel", Georgia, serif',
            fontSize: '0.625rem',
            letterSpacing: '0.08em',
            whiteSpace: 'nowrap',
            ...buttonSx,
          }}
        >
          {saved ? 'Saved instance' : 'Save instance'}
        </Button>
      </span>
    </Tooltip>
  );
}
