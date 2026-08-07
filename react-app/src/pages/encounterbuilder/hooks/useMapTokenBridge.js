import { useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../../shared/cloud/AuthProvider.jsx';
import { supabase } from '../../../shared/cloud/supabaseClient.js';
import { updateTokensBySourceRef } from '../../../shared/cloud/vtt.js';
import {
  monsterRefs,
  rowBelongsToFight,
  tokenFromRow,
  tokenPatchFromCombatant,
  vitalsSignature,
} from '../../../shared/vtt/tokenBridge.js';

// Live sync between this fight's creatures and their pieces on the battle map.
//
// The party already works this way: a character's row in `characters` is read
// and written by both tools, so the database carries the hit points and it does
// not matter which tab, window or machine either side is on. A creature has no
// sheet, but an imported piece has its own row in `map_tokens` and a
// `source_ref` naming the combatant it stands for — so that row is the meeting
// point, and this is the same arrangement rather than a second invention.
//
// What that buys over the localStorage bridge: it crosses devices, and it does
// not need the other side to be open. A creature wounded here is wounded on the
// board the next time anyone opens it.
//
// One subscription, not one per creature: a fight of twenty monsters would be
// twenty postgres_changes bindings on one socket. RLS already limits the feed to
// the GM's own campaigns, and sorting our own pieces out of it is a string
// compare.
const WRITE_DEBOUNCE_MS = 400;

export function useMapTokenBridge({ instanceId, combat, dispatch }) {
  const { cloudEnabled, status, user } = useAuth();
  const canSync = Boolean(cloudEnabled && status === 'authed' && user?.id && supabase);
  const fightId = combat?.fightId || null;

  const refs = useMemo(() => monsterRefs(combat, instanceId), [combat, instanceId]);
  const refKey = refs.map((entry) => entry.ref).join(',');

  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;
  // The last vitals we know the row holds, per reference: what we wrote, and
  // what arrived. Both count — a value that came from the map must not be sent
  // straight back to it.
  const settledRef = useRef(new Map());
  const timersRef = useRef(new Map());

  useEffect(() => {
    settledRef.current.clear();
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
  }, [fightId, instanceId]);

  useEffect(() => () => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
  }, []);

  // Map -> builder.
  useEffect(() => {
    if (!canSync || !instanceId || !fightId) return undefined;

    const handle = (payload) => {
      try {
        const row = payload?.new;
        if (!rowBelongsToFight(row, instanceId, fightId)) return;
        const token = tokenFromRow(row);
        if (!token) return;
        // Recorded before dispatching: this is now what the row holds, so the
        // outbound half has nothing to tell it.
        settledRef.current.set(token.sourceRef, vitalsSignature(token));
        dispatchRef.current({ type: 'syncFromMapToken', token });
      } catch (_) {
        // Realtime is opportunistic; a bad payload must not break local combat.
      }
    };

    let channel;
    try {
      channel = supabase.channel(`gb-fight-pieces-${String(fightId).replace(/[^a-z0-9_-]/gi, '_').slice(0, 40)}`);
      channel.on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'map_tokens',
      }, handle);
      channel.subscribe();
    } catch (_) {
      return undefined;
    }

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (_) {
        // Cleanup stays fail-soft if the socket was already closed.
      }
    };
  }, [canSync, fightId, instanceId]);

  // Builder -> map. Debounced per creature: dragging a hit point slider is one
  // write when it stops, not one per pixel.
  useEffect(() => {
    if (!canSync || !instanceId || !fightId) return;

    for (const { ref, combatant } of refs) {
      const signature = vitalsSignature(combatant);
      const settled = settledRef.current.get(ref);
      // First sight of a creature seeds the comparison instead of writing: the
      // fight was just restored, and the row already says this.
      if (settled === undefined) {
        settledRef.current.set(ref, signature);
        continue;
      }
      if (settled === signature) continue;
      settledRef.current.set(ref, signature);

      const patch = tokenPatchFromCombatant(combatant);
      const existing = timersRef.current.get(ref);
      if (existing) clearTimeout(existing);
      timersRef.current.set(ref, setTimeout(() => {
        timersRef.current.delete(ref);
        updateTokensBySourceRef(ref, patch).catch(() => {
          // Best effort. The piece may simply never have been dropped on a map,
          // and a fight run without a board is the ordinary case.
        });
      }, WRITE_DEBOUNCE_MS));
    }
    // `refKey` rather than `refs`: the array is rebuilt on every render, and the
    // combatants are what this actually watches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSync, combat?.combatants, fightId, instanceId, refKey]);
}
