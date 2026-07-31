import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadClassAdapters, loadCoreAdapters } from '../../../adapters/index.js';
import { useAuth } from '../../../shared/cloud/AuthProvider.jsx';
import { listCampaignCharacters, listMyCampaigns } from '../../../shared/cloud/campaigns.js';
import { summarizeCharacter } from '../../campaigns/sheetSummary.js';
import { clampInt, numberOr } from '../logic/monsterUtils.js';
import { sheetVitalsToCombat } from '../logic/sheetSync.js';

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
  const vitals = sheetVitalsToCombat({ ...summary, hpMax });
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
    currentHP: vitals.hpCurrent ?? clampInt(hpMax, 1, 999, 10),
    tempHP: vitals.tempHP,
    maxHPBonus: vitals.maxHPBonus ?? 0,
    deathSaves: { success: vitals.deathSaves.s, fail: vitals.deathSaves.f },
    initMod: clampInt(summary.initiative, -20, 30, 0),
    iconColor: normalizeIconColor(sheet.classIconColor),
    updatedAt: row.updated_at || null,
  };
}

// Summaries (initiative, AC…) need the class/subclass adapters registered
// before summarizeCharacter runs, so every fetch path loads them first.
async function rowsToPlayers(rows, campaign) {
  const classNames = [...new Set(rows.flatMap((row) => characterClassNames(row?.data)))];
  await Promise.all([
    loadCoreAdapters().catch(() => {}),
    loadClassAdapters(classNames).catch(() => {}),
  ]);
  return rows.map((row) => toEncounterPlayer(row, campaign));
}

async function fetchGmCampaigns(userId) {
  const campaigns = (await listMyCampaigns()).filter((campaign) => campaign.gm === userId);
  return Promise.all(campaigns.map(async (campaign) => ({
    id: campaign.id,
    name: campaign.name || 'Campaign',
    joinCode: campaign.join_code || null,
    players: await rowsToPlayers(await listCampaignCharacters(campaign.id), campaign),
  })));
}

export function useCampaignPlayers() {
  const { cloudEnabled, status, user } = useAuth();
  const userId = user?.id;
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
      if (!userId) {
        setPayload({ cloudEnabled: true, status: 'anon', signedIn: false, loading: false, campaigns: [], error: null });
        return;
      }

      setPayload((prev) => ({ ...prev, cloudEnabled: true, status: 'authed', signedIn: true, loading: true, error: null }));
      try {
        const withPlayers = await fetchGmCampaigns(userId);
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
  }, [cloudEnabled, status, userId]);

  // Re-fetch ONE campaign's sheets on demand (right before importing players,
  // so the encounter gets their latest cloud state instead of the page-load
  // snapshot). The campaign list itself only repopulates on page load.
  // Returns the fresh player list, or null when unavailable/failed — callers
  // fall back to the cached list in that case.
  const refreshCampaign = useCallback(async (campaignId) => {
    if (!cloudEnabled || !userId || !campaignId) return null;
    const cached = payload.campaigns.find((campaign) => campaign.id === campaignId);
    if (!cached) return null;
    try {
      const rows = await listCampaignCharacters(campaignId);
      const players = await rowsToPlayers(rows, { id: cached.id, name: cached.name });
      setPayload((prev) => ({
        ...prev,
        error: null,
        campaigns: prev.campaigns.map((campaign) => (
          campaign.id === campaignId ? { ...campaign, players } : campaign
        )),
      }));
      return players;
    } catch (error) {
      setPayload((prev) => ({ ...prev, error: error?.message || 'Failed to load campaign players.' }));
      return null;
    }
  }, [cloudEnabled, userId, payload.campaigns]);

  return useMemo(() => ({ ...payload, refreshCampaign }), [payload, refreshCampaign]);
}
