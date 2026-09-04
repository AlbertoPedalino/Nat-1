import {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import AppTopBar, { APP_TOP_BAR_HEIGHT } from '../../components/AppTopBar.jsx';
import { toRoster } from '../../shared/campaign/roster.js';
import { useGmCampaigns } from '../../shared/campaign/useGmCampaigns.js';
import { useAuth } from '../../shared/cloud/AuthProvider.jsx';
import { fetchScene } from '../../shared/cloud/vtt.js';
import { useLiveSession } from '../../shared/vtt/useLiveSession.js';
import { sessionCameraSource } from '../../shared/vtt/cameraSync.js';
import { VTT_COLORS, vttAlpha } from '../../shared/vtt/colors.js';
import { spectatorRoute } from '../../shared/vtt/spectator.js';
import CampaignLinksMenu from './components/CampaignLinksMenu.jsx';
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
  const spectator = spectatorRoute(location.search);
  const spectatorRequested = spectator.requested;
  // Owned by the VTT page rather than a scene editor, so navigating between
  // scenes does not sever an already-open projector from this GM window.
  const presenterSourceRef = useRef(sessionCameraSource());
  const presenterFollowingRef = useRef(true);

  const {
    allCampaigns,
    campaigns,
    error: campaignError,
    loading: loadingCampaigns,
  } = useGmCampaigns({ mapRows: async (rows) => toRoster(rows) });
  const runsCampaigns = campaigns.length > 0;

  const { scene: liveScene, loading: loadingSession } = useLiveSession({
    campaignId: joinedCampaign,
    enabled: cloudEnabled && status === 'authed' && Boolean(joinedCampaign),
  });

  const [scene, setScene] = useState(null);
  // A real fullscreen element is painted alone, so the bar is gone whatever we
  // do. Where the browser has no Fullscreen API — every iPhone — the map merely
  // covers the window, and this bar is fixed and above it: it has to be taken
  // away by hand, or it sits over the map's own controls along the top edge.
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [loading, setLoading] = useState(Boolean(requestedScene));
  const [error, setError] = useState('');
  const loadRequestRef = useRef(0);

  const loadScene = useCallback(async (id) => {
    const request = ++loadRequestRef.current;
    if (!id || !cloudEnabled || status !== 'authed') {
      setScene(null);
      setLoading(false);
      setError('');
      return;
    }
    setLoading(true);
    try {
      const loaded = await fetchScene(id);
      if (request !== loadRequestRef.current) return;
      setScene(loaded);
      // A player is not told the difference between a scene that is not live and
      // one that does not exist, because RLS does not tell us either: both come
      // back as no row. That is the point — preparation stays invisible.
      setError(loaded ? '' : 'This map is not on the table right now.');
    } catch (cause) {
      if (request !== loadRequestRef.current) return;
      setScene(null);
      setError(cause?.message || 'Could not open this scene.');
    } finally {
      if (request === loadRequestRef.current) setLoading(false);
    }
  }, [cloudEnabled, status]);

  // Joining a table follows the live scene, whatever it becomes; opening one as
  // GM follows the URL.
  const targetId = joinedCampaign ? (liveScene?.id || '') : requestedScene;

  useEffect(() => { loadScene(targetId); }, [loadScene, targetId]);

  // The projector opens in front of the GM, which is not where the GM wants to
  // be: it belongs on the television while they keep running the game. It is a
  // separate window rather than a tab precisely so this is possible — browsers
  // refuse to move the focus between tabs from script, but a popup may step
  // aside and raise the window that opened it.
  //
  // Twice: the first attempt lands while this window is still being handed the
  // focus, and some browsers only settle it after load.
  useEffect(() => {
    if (!spectatorRequested) return undefined;
    const handBack = () => {
      try {
        const opener = window.opener;
        if (!opener || opener.closed) return;
        window.blur();
        opener.focus();
      } catch (_) {
        // A projector reached by a pasted link has no opener to return to.
      }
    };
    handBack();
    const retry = setTimeout(handBack, 400);
    return () => clearTimeout(retry);
  }, [spectatorRequested]);

  const openScene = useCallback((id) => {
    navigate(id ? `/vtt?scene=${encodeURIComponent(id)}` : '/vtt');
  }, [navigate]);

  const joinCampaign = useCallback((id) => {
    navigate(`/vtt?campaign=${encodeURIComponent(id)}`);
  }, [navigate]);

  const gate = useMemo(() => {
    if (spectator.requested && (!spectator.source || !joinedCampaign)) {
      return 'This spectator link is not valid.';
    }
    if (!cloudEnabled) return 'Online features are not configured, and maps only exist online.';
    if (status === 'loading') return null;
    if (status !== 'authed') return 'Sign in to join your table.';
    return '';
  }, [cloudEnabled, joinedCampaign, spectator.requested, spectator.source, status]);

  const sessionBusy = loading || (Boolean(joinedCampaign) && loadingSession);
  const busy = spectator.requested
    ? (!scene && sessionBusy)
    : sessionBusy || loadingCampaigns;
  const atRoot = !requestedScene && !joinedCampaign;

  // With a scene open the page stops being a document and becomes a screen: it
  // takes exactly the window's height and hands what is left to the map, so the
  // board reaches the bottom edge whatever is stacked above it. At the root it
  // is a list of scenes and tables again, and lists scroll.
  const mapMode = Boolean(!gate && !busy && scene && !spectator.requested);

  // The campaign this window is looking at, but only when the signed-in user is
  // the one running it: the top bar's LINKS button manages that table's tools,
  // and a player at the table has none of them.
  const ownCampaignId = useMemo(() => {
    const id = scene?.campaignId || joinedCampaign || '';
    return campaigns.some((campaign) => campaign.id === id) ? id : '';
  }, [campaigns, joinedCampaign, scene]);

  return (
    <Box
      sx={spectator.requested
        ? spectatorPageSx
        : [pageSx, mapMode && pageMapSx, mapFullscreen && pageCoveredSx]}
    >
      {!spectator.requested && !mapFullscreen ? (
        <AppTopBar home backTo={atRoot ? '/campaigns' : '/vtt'} backLabel={atRoot ? 'Campaigns' : 'Tables'}>
          {ownCampaignId ? <CampaignLinksMenu campaignId={ownCampaignId} /> : null}
        </AppTopBar>
      ) : null}
      <Box
        component="main"
        sx={spectator.requested ? spectatorContentSx : [contentSx, mapMode && contentMapSx]}
      >
        {gate ? <Typography sx={s.noticeSx}>{gate}</Typography> : null}
        {!gate && busy ? <CircularProgress size={24} /> : null}
        {!gate && !busy && error && (requestedScene || joinedCampaign) ? (
          <Typography sx={s.errorSx}>{error}</Typography>
        ) : null}

        {/* At the root a GM manages their scenes; everyone also sees the tables
            they play at, because running one campaign does not stop you being a
            player in another. */}
        {!gate && !busy && atRoot ? (
          <Box sx={s.rootStackSx}>
            {runsCampaigns ? (
              <ScenePicker
                campaigns={campaigns}
                loadingCampaigns={loadingCampaigns}
                campaignError={campaignError}
                onOpen={openScene}
              />
            ) : null}
            <CampaignSessionPicker
              campaigns={allCampaigns}
              onJoin={joinCampaign}
              showEmpty={!runsCampaigns}
            />
          </Box>
        ) : null}

        {!gate && !busy && joinedCampaign && !scene && !error ? (
          spectator.requested
            ? <Typography sx={spectatorWaitingSx}>Waiting for the live scene…</Typography>
            : <SessionGate loading={false} />
        ) : null}
        {!gate && !busy && scene ? (
          <SceneEditor
            scene={scene}
            onSceneChange={setScene}
            // A player is carried by the live scene and never navigates: the
            // editor only offers this to the GM.
            onOpenScene={openScene}
            onMapFullscreenChange={setMapFullscreen}
            spectator={spectator.requested}
            spectatorSource={spectator.source}
            cameraSourceId={presenterSourceRef.current}
            presenterFollowingRef={presenterFollowingRef}
          />
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
  // Tighter than the other tools on purpose: every pixel here is map.
  py: 1,
  boxSizing: 'border-box',
};

// `dvh` rather than `vh`: on a phone `100vh` counts the strip behind the address
// bar, so the bottom of the map was under the browser's own chrome. `dvh`
// follows the bar as it hides and shows.
const pageMapSx = {
  height: '100dvh',
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

// Nothing is left to make room for once the bar is gone: the padding that held
// its place would otherwise show as a strip of background under a map that is
// supposed to be the whole screen.
const pageCoveredSx = {
  pt: 0,
};

const contentMapSx = {
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  // A live scene is a screen-sized workspace. The document layout above is
  // capped for readable lists, but carrying that cap into map mode leaves
  // battle maps and backgrounds boxed into 1600 px on wider displays.
  maxWidth: 'none',
};

const spectatorPageSx = {
  width: '100vw',
  height: '100vh',
  overflow: 'hidden',
  bgcolor: VTT_COLORS.black,
};

const spectatorContentSx = {
  width: '100%',
  height: '100%',
  overflow: 'hidden',
};

const spectatorWaitingSx = {
  position: 'fixed',
  inset: 0,
  display: 'grid',
  placeItems: 'center',
  color: vttAlpha(VTT_COLORS.white, 0.58),
  fontFamily: '"Cinzel", Georgia, serif',
  letterSpacing: '0.08em',
};
