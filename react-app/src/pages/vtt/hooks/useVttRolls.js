import {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { formatRollTitle } from '../../../shared/character/dice.js';
import { useRollChannel } from '../../../shared/cloud/useRollChannel.js';
import {
  addRoll,
  currentBubbles,
  currentThrows,
  queueRollToast,
  rollAuthor,
} from '../../../shared/vtt/rollFeed.js';
import { throwFormula } from '../../../shared/vtt/throwRoll.js';

export function useVttRolls({ campaignId, role, roster, tokens }) {
  const pendingToastsRef = useRef(new Map());
  const [feed, setFeed] = useState([]);
  const [toast, setToast] = useState(null);
  const [tick, setTick] = useState(0);

  const dismissToast = useCallback(() => setToast(null), []);
  const showSettledToast = useCallback((rollId) => {
    const entry = pendingToastsRef.current.get(rollId);
    if (!entry) return;
    pendingToastsRef.current.delete(rollId);
    setToast(entry);
  }, []);
  const clearFeed = useCallback(() => setFeed([]), []);

  const handleSheetRoll = useCallback((roll) => {
    const immediate = queueRollToast(roll, pendingToastsRef.current);
    if (immediate) setToast(immediate);
    setFeed((current) => addRoll(current, roll, { local: true }));
  }, []);

  const { publish } = useRollChannel({
    campaignId,
    onRoll: (roll) => setFeed((current) => addRoll(current, roll)),
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
    const superseded = queueRollToast(entry, pendingToastsRef.current);
    if (superseded) setToast(superseded);
    setFeed((current) => addRoll(current, entry, { local: true }));
    publish(entry);
  }, [publish, role.isGm, role.ownedCharacterIds, roster, tokens]);

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
    showSettledToast,
    toast,
  };
}
