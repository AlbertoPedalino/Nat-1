import { useCallback, useEffect, useState } from 'react';
import { useRollChannel } from '../../../shared/cloud/sync/useRollChannel.js';
import { makeRollEntry } from '../../../shared/vtt/rolls/rollFeed.js';
import { buildEncounterDiceToast } from '../../../shared/character/dice/encounterDiceToast.js';
import { persistRollSettings, readRollSettings } from '../state/storage.js';
import { readGmRollsShown, rollVisibility } from '../../../shared/cloud/sync/rollVisibility.js';

export function useEncounterRolls({ instanceId, players, campaigns, dispatch }) {
  const [settings, setSettings] = useState(() => readRollSettings(instanceId));
  const partyCampaigns = [...new Set(players.map((player) => player.campaignId).filter(Boolean))];
  const inferred = partyCampaigns.length === 1 ? partyCampaigns[0] : null;
  const requested = settings.campaignId === undefined ? inferred : settings.campaignId;
  const campaignId = campaigns.some((campaign) => campaign.id === requested) ? requested : null;

  // Rolls from the campaign land in the log as the channel carries them.
  const receive = useCallback((entry) => dispatch({ type: 'addRoll', entry }), [dispatch]);

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

  // A roll made here: into the log, and out to the campaign. A creature or
  // custom roll is the GM's (shown to players by the campaign's switch); a
  // `localOnly` one (fumbles) is a table roll, for the GM only.
  const shareRoll = useCallback((result, actor, { localOnly = false } = {}) => {
    const entry = makeRollEntry(buildEncounterDiceToast(result), {
      idPrefix: 'encounter',
      actorName: actor || 'GM',
      characterId: result.characterId,
      sourceRef: result.sourceRef,
      identity: result,
      note: result.note,
      visibility: rollVisibility(localOnly ? 'table' : 'gm', readGmRollsShown(campaignId)),
    });
    dispatch({ type: 'addRoll', entry, local: true });
    if (!localOnly) publish(entry, { visibility: entry.visibility });
  }, [campaignId, dispatch, publish]);

  return { campaignId, updateSettings, shareRoll };
}
