import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import AppTopBar, { APP_TOP_BAR_HEIGHT } from '../../components/AppTopBar.jsx';
import { toRoster } from '../../shared/campaign/roster.js';
import { useGmCampaigns } from '../../shared/campaign/useGmCampaigns.js';
import { useAuth } from '../../shared/cloud/AuthProvider.jsx';
import { fetchScene } from '../../shared/cloud/vtt.js';
import { useLiveSession } from '../../shared/vtt/useLiveSession.js';
import CampaignSessionPicker from './components/CampaignSessionPicker.jsx';
import SceneEditor from './components/SceneEditor.jsx';
import ScenePicker from './components/ScenePicker.jsx';
import SessionGate from './components/SessionGate.jsx';
import * as s from './styles.js';

// The VTT is cloud-only: without a signed-in account there is no scene to show,
// because scenes never exist locally. Every other tool degrades to local-only
// instead, so this page has to say why it is empty.
//
// Two audiences on one route, told apart by the query string:
//   ?scene=<id>     a GM opening one of their own scenes
//   ?campaign=<id>  a player joining a table, put wherever the live scene is
// A player never picks a scene, and is moved along when the GM switches.
export default function VttPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { cloudEnabled, status } = useAuth();
  const params = new URLSearchParams(location.search);
  const requestedScene = params.get('scene') || '';
  const joinedCampaign = params.get('campaign') || '';

  const { campaigns, loading: loadingCampaigns } = useGmCampaigns({ mapRows: async (rows) => toRoster(rows) });
  const runsCampaigns = campaigns.length > 0;

  const { scene: liveScene, loading: loadingSession } = useLiveSession({
    campaignId: joinedCampaign,
    enabled: cloudEnabled && status === 'authed' && Boolean(joinedCampaign),
  });

  const [scene, setScene] = useState(null);
  const [loading, setLoading] = useState(Boolean(requestedScene));
  const [error, setError] = useState('');

  const loadScene = useCallback(async (id) => {
    if (!id || !cloudEnabled || status !== 'authed') {
      setScene(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const loaded = await fetchScene(id);
      setScene(loaded);
      // A player is not told the difference between a scene that is not live and
      // one that does not exist, because RLS does not tell us either: both come
      // back as no row. That is the point — preparation stays invisible.
      setError(loaded ? '' : 'This map is not on the table right now.');
    } catch (cause) {
      setScene(null);
      setError(cause?.message || 'Could not open this scene.');
    } finally {
      setLoading(false);
    }
  }, [cloudEnabled, status]);

  // Joining a table follows the live scene, whatever it becomes; opening one as
  // GM follows the URL.
  const targetId = joinedCampaign ? (liveScene?.id || '') : requestedScene;

  useEffect(() => { loadScene(targetId); }, [loadScene, targetId]);

  const openScene = useCallback((id) => {
    navigate(id ? `/vtt?scene=${encodeURIComponent(id)}` : '/vtt');
  }, [navigate]);

  const joinCampaign = useCallback((id) => {
    navigate(`/vtt?campaign=${encodeURIComponent(id)}`);
  }, [navigate]);

  const gate = useMemo(() => {
    if (!cloudEnabled) return 'Online features are not configured, and maps only exist online.';
    if (status === 'loading') return null;
    if (status !== 'authed') return 'Sign in to join your table.';
    return '';
  }, [cloudEnabled, status]);

  const busy = loading || loadingCampaigns || (Boolean(joinedCampaign) && loadingSession);
  const atRoot = !requestedScene && !joinedCampaign;

  return (
    <Box sx={pageSx}>
      <AppTopBar home backTo={atRoot ? '/campaigns' : '/vtt'} backLabel={atRoot ? 'Campaigns' : 'Tables'} />
      <Box component="main" sx={contentSx}>
        {gate ? <Typography sx={s.noticeSx}>{gate}</Typography> : null}
        {!gate && busy ? <CircularProgress size={24} /> : null}
        {!gate && !busy && error && requestedScene ? <Typography sx={s.errorSx}>{error}</Typography> : null}

        {/* At the root a GM manages their scenes; everyone also sees the tables
            they play at, because running one campaign does not stop you being a
            player in another. */}
        {!gate && !busy && atRoot ? (
          <Box sx={s.rootStackSx}>
            {runsCampaigns ? <ScenePicker onOpen={openScene} /> : null}
            <CampaignSessionPicker onJoin={joinCampaign} showEmpty={!runsCampaigns} />
          </Box>
        ) : null}

        {!gate && !busy && joinedCampaign && !scene ? <SessionGate loading={false} /> : null}
        {!gate && !busy && scene ? <SceneEditor scene={scene} onSceneChange={setScene} /> : null}
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
  // Tighter than the other tools on purpose: every pixel here is map.
  py: 1,
  boxSizing: 'border-box',
};
