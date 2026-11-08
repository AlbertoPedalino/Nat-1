import { useCallback, useEffect, useState } from 'react';
import { useRollChannel } from '../../../shared/cloud/sync/useRollChannel.js';
import { makeRollEntry, normalizeRoll } from '../../../shared/vtt/rolls/rollFeed.js';
import { buildEncounterDiceToast } from '../../../shared/character/dice/encounterDiceToast.js';
import { normalizeRollIdentity } from '../../../shared/character/dice/rollLogPresentation.js';
import { persistRollSettings, readRollSettings } from '../state/storage.js';

export function useEncounterRolls({ instanceId, players, campaigns, dispatch }) {
  const [settings, setSettings] = useState(() => readRollSettings(instanceId));
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
      persistRollSettings(instanceId, next);
      return next;
    });
  }, [instanceId]);

  const shareRoll = useCallback((result, actor) => {
    const toast = buildEncounterDiceToast(result);
    const entry = makeRollEntry(toast, {
      idPrefix: 'encounter',
      actorName: actor || 'GM',
      characterId: result.characterId,
      sourceRef: result.sourceRef,
      identity: result,
      note: result.note,
      visibility: showToPlayers ? 'public' : 'gm',
    });
    // The builder's own log keeps the full result (natural d20, class).
    dispatch({
      type: 'addRoll',
      roll: { ...result, rolls: toast.rolls, id: entry.id, timestamp: entry.timestamp, visibility: entry.visibility },
      actor: entry.actorName,
    });
    publish(entry, { visibility: entry.visibility });
  }, [dispatch, publish, showToPlayers]);

  return { campaignId, showToPlayers, updateSettings, shareRoll };
}
