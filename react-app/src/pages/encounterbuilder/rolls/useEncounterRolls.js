import { useCallback, useEffect, useState } from 'react';
import { useRollChannel } from '../../../shared/cloud/sync/useRollChannel.js';
import { normalizeRoll } from '../../../shared/vtt/rolls/rollFeed.js';
import { buildEncounterDiceToast } from '../../../shared/character/dice/encounterDiceToast.js';
import { normalizeRollIdentity } from '../../../shared/character/dice/rollLogPresentation.js';
import { getStorageJson, setStorageJson } from '../../../shared/storage/storage.js';
import { makeId } from '../../../shared/ids.js';

function readSettings(instanceId) {
  return getStorageJson(`gb-enc-rolls:${instanceId}`, {});
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
      ...normalizeRollIdentity(roll),
      rolls: roll.rolls,
      bonus: roll.bonus,
      mode: roll.mode,
    } });
  }, [dispatch]);

  const { publish } = useRollChannel({ campaignId, isGm: true, onRoll: receive });

  useEffect(() => {
    dispatch({ type: 'clearRollLog' });
  }, [campaignId, dispatch]);

  const updateSettings = useCallback((patch) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      setStorageJson(`gb-enc-rolls:${instanceId}`, next);
      return next;
    });
  }, [instanceId]);

  const shareRoll = useCallback((result, actor) => {
    const visibility = showToPlayers ? 'public' : 'gm';
    const timestamp = Date.now();
    const id = makeId('encounter');
    const toast = buildEncounterDiceToast(result);
    const annotated = { ...result, rolls: toast.rolls, id, timestamp, visibility };
    dispatch({ type: 'addRoll', roll: annotated, actor: actor || 'GM' });
    publish({
      ...toast,
      id,
      timestamp,
      actorName: actor || 'GM',
      characterId: result.characterId || null,
      sourceRef: result.sourceRef || null,
      ...normalizeRollIdentity(result),
      note: result.note,
      thrown: Boolean(toast.rolls?.length),
    }, { visibility });
  }, [dispatch, publish, showToPlayers]);

  return { campaignId, showToPlayers, updateSettings, shareRoll };
}
