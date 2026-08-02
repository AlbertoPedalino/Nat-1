import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import AppTopBar, { APP_TOP_BAR_HEIGHT } from '../../components/AppTopBar.jsx';
import { useAuth } from '../../shared/cloud/AuthProvider.jsx';
import { fetchScene } from '../../shared/cloud/vtt.js';
import SceneEditor from './components/SceneEditor.jsx';
import ScenePicker from './components/ScenePicker.jsx';

// The VTT is cloud-only: without a signed-in account there is no scene to show,
// because scenes never exist locally. Every other tool degrades to local-only
// instead, so this page has to say why it is empty.
export default function VttPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { cloudEnabled, status } = useAuth();
  const sceneId = new URLSearchParams(location.search).get('scene') || '';
  const [scene, setScene] = useState(null);
  const [loading, setLoading] = useState(Boolean(sceneId));
  const [error, setError] = useState('');

  const loadScene = useCallback(async () => {
    if (!sceneId || !cloudEnabled || status !== 'authed') {
      setScene(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const loaded = await fetchScene(sceneId);
      setScene(loaded);
      setError(loaded ? '' : 'This scene does not exist, or you are not in its campaign.');
    } catch (cause) {
      setScene(null);
      setError(cause?.message || 'Could not open this scene.');
    } finally {
      setLoading(false);
    }
  }, [cloudEnabled, sceneId, status]);

  useEffect(() => { loadScene(); }, [loadScene]);

  const openScene = useCallback((id) => {
    navigate(id ? `/vtt?scene=${encodeURIComponent(id)}` : '/vtt');
  }, [navigate]);

  const gate = useMemo(() => {
    if (!cloudEnabled) return 'Online features are not configured, and maps only exist online.';
    if (status === 'loading') return null;
    if (status !== 'authed') return 'Sign in to open your campaign maps.';
    return '';
  }, [cloudEnabled, status]);

  return (
    <Box sx={pageSx}>
      <AppTopBar home backTo={sceneId ? '/vtt' : '/campaigns'} backLabel={sceneId ? 'Scenes' : 'Campaigns'} />
      <Box component="main" sx={contentSx}>
        {gate ? <Typography sx={noticeSx}>{gate}</Typography> : null}
        {gate === null || loading ? <CircularProgress size={24} /> : null}
        {!gate && !loading && error ? <Typography sx={errorSx}>{error}</Typography> : null}
        {!gate && !loading && !sceneId ? <ScenePicker onOpen={openScene} /> : null}
        {!gate && !loading && sceneId && scene ? (
          <SceneEditor scene={scene} onSceneChange={setScene} />
        ) : null}
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
  maxWidth: 1600,
  mx: 'auto',
  px: { xs: 1, md: 2 },
  py: 2,
  boxSizing: 'border-box',
};

const noticeSx = { color: 'text.secondary', fontStyle: 'italic' };
const errorSx = { color: 'error.main', mb: 1 };
