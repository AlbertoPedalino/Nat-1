import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Box } from '@mui/material';
import AppTopBar, { APP_TOP_BAR_HEIGHT } from '../../components/AppTopBar.jsx';
import SaveInstanceButton from '../../components/SaveInstanceButton.jsx';
import StandaloneHtmlFrame from '../../components/StandaloneHtmlFrame.jsx';
import { loadClassAdapters, loadCoreAdapters } from '../../adapters/index.js';
import { useAuth } from '../../shared/cloud/AuthProvider.jsx';
import { listCampaignCharacters, listMyCampaigns } from '../../shared/cloud/campaigns.js';
import { summarizeCharacter } from '../campaigns/sheetSummary.js';

const MESSAGE_TYPE = 'gb:campaign-players';
const READY_TYPE = 'gb:encounter-builder-ready';
const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;

function numberOr(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clampInt(value, min, max, fallback) {
  return Math.max(min, Math.min(max, Math.round(numberOr(value, fallback))));
}

function getCharacterLevel(character) {
  const explicit = Number(character?.level);
  if (Number.isFinite(explicit) && explicit > 0) return clampInt(explicit, 1, 20, 1);

  const primary = Number(character?.classLevel);
  const extras = Array.isArray(character?.extraClasses)
    ? character.extraClasses.reduce((sum, item) => sum + numberOr(item?.level, 0), 0)
    : 0;
  const total = (Number.isFinite(primary) && primary > 0 ? primary : 0) + extras;
  return clampInt(total || 1, 1, 20, 1);
}

function normalizeIconColor(value) {
  const color = typeof value === 'string' ? value.trim() : '';
  return HEX_COLOR_RE.test(color) ? color.toLowerCase() : null;
}

function characterClassNames(character) {
  return [
    character?.className,
    ...(Array.isArray(character?.extraClasses) ? character.extraClasses.map((entry) => entry?.name) : []),
  ].filter(Boolean);
}

function toEncounterPlayer(row, campaign) {
  const sheet = row?.data || {};
  const summary = summarizeCharacter(sheet) || {};
  const hpMax = summary.maxHP ?? summary.currentHP ?? sheet.maxHP ?? 10;

  return {
    id: row.id,
    sourceId: row.id,
    campaignId: campaign.id,
    campaignName: campaign.name || 'Campaign',
    name: sheet.name || row.name || 'Character',
    ownerUsername: row.owner_username || null,
    level: getCharacterLevel(sheet),
    ac: clampInt(summary.ac, 1, 99, 10),
    hpMax: clampInt(hpMax, 1, 999, 10),
    initMod: clampInt(summary.initiative, -20, 30, 0),
    iconColor: normalizeIconColor(sheet.classIconColor),
    updatedAt: row.updated_at || null,
  };
}

export default function EncounterBuilderPage() {
  const location = useLocation();
  const { cloudEnabled, status, user } = useAuth();
  const iframeRef = useRef(null);
  const [frameLoads, setFrameLoads] = useState(0);
  const [instanceSaved, setInstanceSaved] = useState(false);
  const [payload, setPayload] = useState({
    cloudEnabled,
    status: cloudEnabled ? 'loading' : 'disabled',
    signedIn: false,
    loading: cloudEnabled,
    campaigns: [],
    error: null,
  });
  const src = `${import.meta.env.BASE_URL}tools/encounter-builder.html${location.search}`;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!cloudEnabled) {
        setPayload({ cloudEnabled: false, status: 'disabled', signedIn: false, loading: false, campaigns: [], error: null });
        return;
      }
      if (status === 'loading') {
        setPayload({ cloudEnabled: true, status: 'loading', signedIn: false, loading: true, campaigns: [], error: null });
        return;
      }
      if (!user?.id) {
        setPayload({ cloudEnabled: true, status: 'anon', signedIn: false, loading: false, campaigns: [], error: null });
        return;
      }

      setPayload((prev) => ({ ...prev, cloudEnabled: true, status: 'authed', signedIn: true, loading: true, error: null }));
      try {
        const campaigns = (await listMyCampaigns()).filter((campaign) => campaign.gm === user.id);
        const rowsByCampaign = await Promise.all(campaigns.map(async (campaign) => ({
          campaign,
          rows: await listCampaignCharacters(campaign.id),
        })));
        const classNames = [
          ...new Set(rowsByCampaign.flatMap(({ rows }) => rows.flatMap((row) => characterClassNames(row?.data)))),
        ];
        await Promise.all([
          loadCoreAdapters().catch(() => {}),
          loadClassAdapters(classNames).catch(() => {}),
        ]);
        const withPlayers = rowsByCampaign.map(({ campaign, rows }) => {
          return {
            id: campaign.id,
            name: campaign.name || 'Campaign',
            joinCode: campaign.join_code || null,
            players: rows.map((row) => toEncounterPlayer(row, campaign)),
          };
        });
        if (!cancelled) {
          setPayload({ cloudEnabled: true, status: 'authed', signedIn: true, loading: false, campaigns: withPlayers, error: null });
        }
      } catch (error) {
        if (!cancelled) {
          setPayload({
            cloudEnabled: true,
            status: 'authed',
            signedIn: true,
            loading: false,
            campaigns: [],
            error: error?.message || 'Failed to load campaign players.',
          });
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [cloudEnabled, status, user?.id]);

  const postPayload = useCallback(() => {
    const target = iframeRef.current?.contentWindow;
    if (!target) return;
    target.postMessage({ type: MESSAGE_TYPE, payload }, window.location.origin);
  }, [payload]);

  const postToFrame = useCallback((type) => {
    iframeRef.current?.contentWindow?.postMessage({ type }, window.location.origin);
  }, []);

  useEffect(() => {
    postPayload();
  }, [postPayload, frameLoads]);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === READY_TYPE) postPayload();
      if (event.data?.type === 'gb:instance-state' && event.data?.kind === 'encounter') {
        setInstanceSaved(Boolean(event.data.saved));
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [postPayload]);

  return (
    <Box sx={encounterPageSx}>
      <AppTopBar>
        <SaveInstanceButton saved={instanceSaved} onClick={() => postToFrame('gb:save-instance')} />
      </AppTopBar>
      <StandaloneHtmlFrame
        title="Encounter Builder"
        src={src}
        iframeRef={iframeRef}
        onLoad={() => {
          setFrameLoads((value) => value + 1);
          postToFrame('gb:request-instance-state');
        }}
        rootSx={encounterFrameSx}
      />
    </Box>
  );
}

const encounterPageSx = {
  minHeight: '100vh',
  bgcolor: '#0f0e0d',
  pt: APP_TOP_BAR_HEIGHT,
};

const encounterFrameSx = {
  height: `calc(100vh - ${APP_TOP_BAR_HEIGHT})`,
};
