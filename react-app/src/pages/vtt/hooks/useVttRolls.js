import {
  useCallback, useEffect, useMemo, useState,
} from 'react';
import { formatRollTitle } from '../../../shared/character/dice.js';
import { useRollChannel } from '../../../shared/cloud/useRollChannel.js';
import {
  addRoll,
  currentBubbles,
  currentThrows,
  normalizeRoll,
  rollAuthor,
} from '../../../shared/vtt/rollFeed.js';
import { throwFormula } from '../../../shared/vtt/throwRoll.js';

export function useVttRolls({ campaignId, role, roster, tokens }) {
  const [feed, setFeed] = useState([]);
  const [toast, setToast] = useState(null);
  const [tick, setTick] = useState(0);

  const dismissToast = useCallback(() => setToast(null), []);
  const clearFeed = useCallback(() => setFeed([]), []);

  // Feedback is immediate and independent from the physical animation. This
  // matters most on a phone with the sheet covering the map: the dice may be
  // rolling out of sight, but the tap must still visibly produce a result.
  const acceptRoll = useCallback((entry, { local = false } = {}) => {
    const roll = normalizeRoll(entry);
    if (!roll) return;
    setToast({
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
    onRoll: acceptRoll,
  });

  const handleCustomRoll = useCallback((formula) => {
    const id = `custom:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
    const thrown = throwFormula(formula, id);
    if (!thrown) return;
    const entry = {
      id,
      label: formatRollTitle('Custom Roll', formula),
      detail: thrown.detail,
      total: thrown.total,
      rolls: thrown.rolls,
      ...(thrown.modifier ? { meta: { bonus: thrown.modifier } } : {}),
      thrown: true,
      timestamp: Date.now(),
      ...rollAuthor({
        isGm: role.isGm,
        ownedCharacterIds: role.ownedCharacterIds,
        tokens,
        roster,
      }),
    };
    acceptRoll(entry, { local: true });
    publish(entry);
  }, [acceptRoll, publish, role.isGm, role.ownedCharacterIds, roster, tokens]);

  useEffect(() => {
    if (!feed.length) return undefined;
    const timer = setInterval(() => setTick((current) => current + 1), 1000);
    return () => clearInterval(timer);
  }, [feed.length]);

  const tokenByCharacter = useMemo(() => new Map(
    tokens.filter((token) => token.characterId).map((token) => [token.characterId, token]),
  ), [tokens]);

  const bubbles = useMemo(() => currentBubbles(feed)
    .map((roll) => ({ roll, token: tokenByCharacter.get(roll.characterId) }))
    .filter((entry) => entry.token), [feed, tick, tokenByCharacter]);

  const throws = useMemo(() => currentThrows(feed)
    .map((roll) => ({ roll, token: tokenByCharacter.get(roll.characterId) || null })), [feed, tick, tokenByCharacter]);

  return {
    clearFeed,
    dismissToast,
    feed,
    handleCustomRoll,
    handleSheetRoll,
    rollBubbles: bubbles,
    diceThrows: throws,
    toast,
  };
}
