import { useCallback, useEffect, useState } from 'react';
import { useRollChannel } from '../../../shared/cloud/useRollChannel.js';
import { normalizeRoll } from '../../../shared/vtt/rollFeed.js';
import { buildEncounterDiceToast } from '../components/EncounterDiceToast.jsx';

function readSettings(instanceId) {
  try { return JSON.parse(localStorage.getItem(`gb-enc-rolls:${instanceId}`)) || {}; }
  catch (_) { return {}; }
}

export function useEncounterRolls({ instanceId, players, campaigns, dispatch }) {
  const [settings, setSettings] = useState(() => readSettings(instanceId));
  const partyCampaigns = [...new Set(players.map((player) => player.campaignId).filter(Boolean))];
  const inferred = partyCampaigns.length === 1 ? partyCampaigns[0] : null;
  const requested = settings.campaignId === undefined ? inferred : settings.campaignId;
  const campaignId = campaigns.some((campaign) => campaign.id === requested) ? requested : null;
  const showToPlayers = settings.showToPlayers === true;

  const receive = useCallback((entry) => {
    const roll = normalizeRoll(entry);
    if (!roll) return;
    dispatch({ type: 'addRoll', actor: roll.actorName, roll: {
      id: roll.id,
      timestamp: roll.at,
      type: roll.label,
      result: roll.total,
      mathStr: roll.detail,
      note: roll.note,
      visibility: roll.visibility,
    } });
  }, [dispatch]);

  const { publish } = useRollChannel({ campaignId, isGm: true, onRoll: receive });

  useEffect(() => {
    dispatch({ type: 'clearRollLog' });
  }, [campaignId, dispatch]);

  const updateSettings = useCallback((patch) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      try { localStorage.setItem(`gb-enc-rolls:${instanceId}`, JSON.stringify(next)); } catch (_) {}
      return next;
    });
  }, [instanceId]);

  const shareRoll = useCallback((result, actor) => {
    const visibility = showToPlayers ? 'public' : 'gm';
    const timestamp = Date.now();
    const id = `encounter:${timestamp}:${Math.random().toString(36).slice(2, 12)}`;
    const toast = buildEncounterDiceToast(result);
    const annotated = { ...result, id, timestamp, visibility };
    dispatch({ type: 'addRoll', roll: annotated, actor: actor || 'GM' });
    publish({
      ...toast,
      id,
      timestamp,
      actorName: actor || 'GM',
      characterId: null,
      note: result.note,
      thrown: Boolean(toast.rolls?.length),
    }, { visibility });
  }, [dispatch, publish, showToPlayers]);

  return { campaignId, showToPlayers, updateSettings, shareRoll };
}
