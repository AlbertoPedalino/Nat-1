import { Link as RouterLink, useLocation } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import { Compass, Home } from 'lucide-react';
import AppPage from '../../app/navigation/AppPage.jsx';
import { composeMissingPath } from './notFoundPath.js';
import { FONT_SIZES, LETTER_SPACINGS, FONT_WEIGHTS, LINE_HEIGHTS } from '../../shared/ui/fonts.js';
import { SURFACES } from '../../shared/ui/surfaces.js';
import { ICON_SIZES } from '../../shared/ui/iconSizes.js';
import Caption from '../../shared/ui/Caption.jsx';

export default function NotFoundPage() {
  const location = useLocation();
  const missingPath = composeMissingPath(location);

  return (
    <AppPage center maxWidth="none">
      <Box sx={panelSx}>
        <Box sx={messageSx}>
          <Typography component="span" variant="overline" sx={statusSx}>
            404 · Uncharted route
          </Typography>
          <Box sx={compassSx} aria-hidden="true">
            <Compass size={ICON_SIZES.jumbo} strokeWidth={1.5} />
          </Box>
          <Box>
            <Typography variant="h1" sx={titleSx}>
              You wandered off the map.
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1 }}>
              No marked road leads to this corner of the realm.
            </Typography>
          </Box>
          <Box sx={pathBoxSx}>
            <Caption>
              Missing path
            </Caption>
            <Typography component="code" sx={pathTextSx}>
              {missingPath}
            </Typography>
          </Box>
          <Button
            component={RouterLink}
            to="/"
            variant="contained"
            startIcon={<Home size={ICON_SIZES.md} aria-hidden="true" />}
          >
            Return Home
          </Button>
        </Box>
      </Box>
    </AppPage>
  );
}

const panelSx = {
  ...SURFACES.panel,
  width: 1,
  maxWidth: 600,
  p: { xs: 2.5, sm: 4, md: 5 },
};

const messageSx = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: { xs: 2, sm: 2.5 },
  textAlign: 'center',
};

const statusSx = {
  color: 'primary.main',
  fontWeight: FONT_WEIGHTS.bold,
  letterSpacing: LETTER_SPACINGS.lg,
  lineHeight: LINE_HEIGHTS.normal,
};

const compassSx = {
  ...SURFACES.inset,
  width: { xs: 72, sm: 80 },
  height: { xs: 72, sm: 80 },
  display: 'grid',
  placeItems: 'center',
  color: 'primary.main',
  borderRadius: '50%',
};

const titleSx = {
  fontSize: { xs: FONT_SIZES.display, sm: FONT_SIZES.hero },
};

const pathBoxSx = {
  ...SURFACES.inset,
  width: 1,
  minWidth: 0,
  p: 1.5,
};

const pathTextSx = {
  display: 'block',
  mt: 0.5,
  color: 'text.primary',
  overflowWrap: 'anywhere',
  wordBreak: 'break-word',
};
