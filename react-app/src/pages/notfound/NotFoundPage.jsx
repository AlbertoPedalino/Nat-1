import { Link as RouterLink, useLocation } from 'react-router-dom';
import { Box, Button, Paper, Typography } from '@mui/material';
import { Home } from 'lucide-react';
import AppTopBar, { APP_TOP_BAR_HEIGHT } from '../../components/AppTopBar.jsx';

export default function NotFoundPage() {
  const location = useLocation();
  const missingPath = `${location.pathname}${location.search}${location.hash}`;

  return (
    <Box sx={pageSx}>
      <AppTopBar />
      <Box sx={contentSx}>
        <Paper variant="outlined" sx={panelSx}>
          <Box sx={messageSx}>
            <Box>
              <Typography variant="h1">You wandered off the map.</Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                No marked road leads to this corner of the realm.
              </Typography>
            </Box>
            <Box sx={pathBoxSx}>
              <Typography variant="caption" color="text.secondary">
                Missing path
              </Typography>
              <Typography component="code" sx={pathTextSx}>
                {missingPath}
              </Typography>
            </Box>
            <Button
              component={RouterLink}
              to="/"
              variant="contained"
              startIcon={<Home size={16} />}
            >
              Return Home
            </Button>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}

const pageSx = {
  minHeight: '100vh',
  bgcolor: 'background.default',
  pt: APP_TOP_BAR_HEIGHT,
};

const contentSx = {
  minHeight: `calc(100vh - ${APP_TOP_BAR_HEIGHT})`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  px: { xs: 1.5, md: 2 },
  py: 4,
};

const panelSx = {
  width: 1,
  maxWidth: 560,
  p: { xs: 3, md: 4 },
  bgcolor: 'background.paper',
  borderColor: 'divider',
};

const messageSx = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 2.5,
  textAlign: 'center',
};

const pathBoxSx = {
  width: 1,
  minWidth: 0,
  p: 1.5,
  border: 1,
  borderColor: 'divider',
  bgcolor: 'background.default',
};

const pathTextSx = {
  display: 'block',
  mt: 0.5,
  color: 'text.primary',
  overflowWrap: 'anywhere',
};
