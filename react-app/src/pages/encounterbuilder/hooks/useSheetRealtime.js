import { useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../../shared/cloud/AuthProvider.jsx';
import { supabase } from '../../../shared/cloud/supabaseClient.js';
import { summarizeCharacter } from '../../campaigns/sheetSummary.js';
import { sheetVitalsToCombat, sheetVitalsToSheetPatch } from '../logic/sheetSync.js';

function linkedSourceIds(combat) {
  const ids = new Set();
  (combat?.combatants || []).forEach((combatant) => {
    if (combatant?.type === 'player' && combatant.sourceId) ids.add(String(combatant.sourceId));
  });
  return [...ids].sort();
}

function channelSuffix(fightId, sourceIdKey) {
  return `${fightId || 'fight'}-${sourceIdKey}`.replace(/[^a-z0-9_-]/gi, '_').slice(0, 80);
}

function findLinkedCombatant(combat, charId) {
  return (combat?.combatants || []).find((combatant) => (
    combatant?.type === 'player' && String(combatant.sourceId || '') === charId
  ));
}

function sameHpMax(combatant, vitals) {
  if (vitals.hpMax == null) return true;
  return Number(combatant?.hpMax) === Number(vitals.hpMax);
}

export function useSheetRealtime({ view, combat, dispatch, sheetSync }) {
  const { cloudEnabled, status, user } = useAuth();
  const canSync = Boolean(cloudEnabled && status === 'authed' && user?.id && supabase);
  const combatRef = useRef(combat);
  const dispatchRef = useRef(dispatch);
  const sheetSyncRef = useRef(sheetSync);

  combatRef.current = combat;
  dispatchRef.current = dispatch;
  sheetSyncRef.current = sheetSync;

  const sourceIds = useMemo(() => linkedSourceIds(combat), [combat?.combatants]);
  const sourceIdKey = sourceIds.join(',');

  useEffect(() => {
    if (!canSync || view !== 'combat' || !combat?.fightId || !sourceIds.length) return undefined;
    const sourceIdSet = new Set(sourceIds);
    const handlePayload = (payload) => {
      try {
        const row = payload?.new;
        const charId = row?.id ? String(row.id) : '';
        if (!charId || !sourceIdSet.has(charId)) return;
        const summary = summarizeCharacter(row.data);
        if (!summary) return;
        const vitals = sheetVitalsToCombat(summary);
        const patch = sheetVitalsToSheetPatch(vitals);
        const combatant = findLinkedCombatant(combatRef.current, charId);
        if (!combatant) return;
        // Echo handling for max HP. `isOutboundEcho` means these vitals reflect a
        // write of ours. Normally suppress it. The one exception is a base-max
        // change on the sheet (level-up / CON change): same maxHPBonus but a
        // different derived maxHP — that we must adopt. A *stale* echo of an older
        // maxHPBonus (local already clicked ahead) has a DIFFERENT bonus and must
        // stay suppressed, or the modifier bounces back to the old value.
        const sameBonus = Number(combatant.maxHPBonus || 0) === Number(vitals.maxHPBonus || 0);
        const baseMaxChanged = sameBonus && !sameHpMax(combatant, vitals);
        if (sheetSyncRef.current?.isOutboundEcho?.(charId, patch) && !baseMaxChanged) {
          return;
        }
        sheetSyncRef.current?.markCharacterSynced?.(charId, patch);
        dispatchRef.current({ type: 'syncCombatantVitals', sourceId: charId, vitals });
      } catch (_) {
        // Realtime is opportunistic; a bad payload must not break local combat.
      }
    };

    let channel;
    try {
      channel = supabase.channel(`gb-combat-sheet-${channelSuffix(combat.fightId, sourceIdKey)}`);
      sourceIds.forEach((charId) => {
        channel.on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'characters',
          filter: `id=eq.${charId}`,
        }, handlePayload);
      });
      channel.subscribe();
    } catch (_) {
      return undefined;
    }

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (_) {
        // Cleanup should remain fail-soft if the socket was already closed.
      }
    };
  }, [canSync, view, combat?.fightId, sourceIdKey]);
}
