import {
  useCallback, useEffect, useMemo, useState,
} from 'react';
import { useRollChannel } from '../../../shared/cloud/sync/useRollChannel.js';
import { readGmRollsShown, rollVisibility } from '../../../shared/cloud/sync/rollVisibility.js';
import {
  addRoll, currentBubbles, currentThrows, makeRollEntry, normalizeRoll, rollAuthor,
} from '../../../shared/vtt/rolls/rollFeed.js';
import { customRollToast } from '../../../shared/character/dice/customRoll.js';
import { rollDice } from '../../../shared/character/dice/rollNotation.js';
import { buildEncounterDiceToast } from '../../../shared/character/dice/encounterDiceToast.js';
import { makeId } from '../../../shared/ids.js';

export function useVttRolls({ campaignId, role, roster, tokens }) {
  const [feed, setFeed] = useState([]);
  const [toast, setToast] = useState(null);
  const [tick, setTick] = useState(0);
  // Bubbles closed by hand on this screen. Local only: closing one over your
  // own map says nothing about what the rest of the table wants to look at.
  const [dismissedBubbleIds, setDismissedBubbleIds] = useState(() => new Set());

  const dismissToast = useCallback(() => setToast(null), []);
  const clearFeed = useCallback(() => setFeed([]), []);

  // Feedback is immediate and independent from the physical animation. This
  // matters most on a phone with the sheet covering the map: the dice may be
  // rolling out of sight, but the tap must still visibly produce a result.
  const acceptRoll = useCallback((entry, { local = false } = {}) => {
    const roll = normalizeRoll(entry);
    if (!roll) return;
    if (local) setToast({
      ...roll,
      timestamp: roll.at,
      meta: {
        ...(roll.mode ? { mode: roll.mode } : {}),
        ...(roll.bonus != null ? { bonus: roll.bonus } : {}),
      },
    });
    setFeed((current) => addRoll(current, roll, { local }));
  }, []);

  const handleSheetRoll = useCallback((roll) => {
    acceptRoll(roll, { local: true });
  }, [acceptRoll]);

  const { publish } = useRollChannel({
    campaignId,
    isGm: role.isGm,
    onRoll: acceptRoll,
  });

  useEffect(() => {
    setFeed([]);
    setToast(null);
    setDismissedBubbleIds(new Set());
  }, [campaignId, role.isGm]);

  const handleCustomRoll = useCallback((formula) => {
    const toast = customRollToast(formula);
    if (!toast) return;
    const entry = {
      ...toast,
      id: makeId('custom'),
      thrown: true,
      timestamp: Date.now(),
      ...rollAuthor({
        isGm: role.isGm,
        ownedCharacterIds: role.ownedCharacterIds,
        tokens,
        roster,
      }),
      // The GM's own roll follows their switch; a player's is the table's.
      visibility: rollVisibility(role.isGm ? 'gm' : 'player', readGmRollsShown(campaignId)),
    };
    acceptRoll(entry, { local: true });
    publish(entry, { visibility: entry.visibility });
  }, [acceptRoll, campaignId, publish, role.isGm, role.ownedCharacterIds, roster, tokens]);

  // A roll from a creature's stat block, opened on the map by the GM. Shaped as
  // the encounter builder shares its own, so it lands in every log alike and,
  // when public, its bubble and dice over the creature's piece (`sourceRef`).
  // A GM roll (rollVisibility.js): while the GM's switch is off it stays in the
  // GM's log — no bubble, no dice, never on a player's screen or the projector.
  const handleCreatureRoll = useCallback(({
    notation, type, advantage, note = '', actor = {},
  }) => {
    const result = rollDice(notation, type, Math.random, { advantage });
    if (!result) return null;
    const actorName = actor.actorName || 'GM';
    const entry = makeRollEntry(buildEncounterDiceToast({ ...result, actor: actorName }), {
      idPrefix: 'creature', actorName, sourceRef: actor.sourceRef, identity: actor, note, visibility: rollVisibility('gm', readGmRollsShown(campaignId)),
    });
    acceptRoll(entry, { local: true });
    publish(entry, { visibility: entry.visibility });
    return entry;
  }, [acceptRoll, campaignId, publish]);

  useEffect(() => {
    if (!feed.length) return undefined;
    const timer = setInterval(() => setTick((current) => current + 1), 1000);
    return () => clearInterval(timer);
  }, [feed.length]);

  const tokenByCharacter = useMemo(() => new Map(
    tokens.filter((token) => token.characterId).map((token) => [token.characterId, token]),
  ), [tokens]);
  const tokenBySource = useMemo(() => new Map(
    tokens.filter((token) => token.sourceRef).map((token) => [token.sourceRef, token]),
  ), [tokens]);
  const tokenForRoll = useCallback((roll) => (
    tokenByCharacter.get(roll.characterId) || tokenBySource.get(roll.sourceRef) || null
  ), [tokenByCharacter, tokenBySource]);

  const bubbles = useMemo(() => currentBubbles(feed)
    .filter((roll) => !dismissedBubbleIds.has(roll.id))
    .map((roll) => ({ roll, token: tokenForRoll(roll) }))
    .filter((entry) => entry.token), [dismissedBubbleIds, feed, tick, tokenForRoll]);

  // Only ids still in the feed are kept, so the set never outgrows it.
  const dismissRollBubble = useCallback((rollId) => {
    setDismissedBubbleIds((current) => {
      const live = new Set(feed.map((roll) => roll.id));
      return new Set([...current, rollId].filter((id) => live.has(id)));
    });
  }, [feed]);

  const throws = useMemo(() => currentThrows(feed)
    .map((roll) => ({ roll, token: tokenForRoll(roll) })), [feed, tick, tokenForRoll]);

  return {
    clearFeed,
    dismissRollBubble,
    dismissToast,
    feed,
    handleCreatureRoll,
    handleCustomRoll,
    handleSheetRoll,
    rollBubbles: bubbles,
    diceThrows: throws,
    toast,
  };
}
