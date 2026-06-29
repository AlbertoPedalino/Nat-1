import { useEffect, useMemo, useState } from 'react';
import { loadClassAdapters, loadCoreAdapters } from '../../../adapters/index.js';
import { useAuth } from '../../../shared/cloud/AuthProvider.jsx';
import { listCampaignCharacters, listMyCampaigns } from '../../../shared/cloud/campaigns.js';
import { summarizeCharacter } from '../../campaigns/sheetSummary.js';
import { clampInt, numberOr } from '../logic/monsterUtils.js';

const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;

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

export function useCampaignPlayers() {
  const { cloudEnabled, status, user } = useAuth();
  const [payload, setPayload] = useState({
    cloudEnabled,
    status: cloudEnabled ? 'loading' : 'disabled',
    signedIn: false,
    loading: cloudEnabled,
    campaigns: [],
    error: null,
  });

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
        const withPlayers = rowsByCampaign.map(({ campaign, rows }) => ({
          id: campaign.id,
          name: campaign.name || 'Campaign',
          joinCode: campaign.join_code || null,
          players: rows.map((row) => toEncounterPlayer(row, campaign)),
        }));
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
    return () => {
      cancelled = true;
    };
  }, [cloudEnabled, status, user?.id]);

  return useMemo(() => payload, [payload]);
}
