import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchSceneTurns, setSceneTurnFight } from '../../../shared/cloud/api/vtt.js';
import { toSceneTurns } from '../../../shared/vtt/tokens/initiative.js';

// Which fight this scene shows as its initiative, and that fight's round
// (`map_scene_turns`, 20_scene_turns.sql). One small row per scene: read on
// mount and by the scene's recovery, then followed through the scene channel
// (`handleEvent`, wired into useSceneLive).
export function useSceneTurns({ sceneId, isGm }) {
  const [turns, setTurns] = useState(null);
  // A read that left before a realtime event or our own write is older than
  // either, and must not land on top of them.
  const requestRef = useRef(0);

  const reload = useCallback(async () => {
    if (!sceneId) return;
    const request = ++requestRef.current;
    let fresh;
    try {
      fresh = await fetchSceneTurns(sceneId);
    } catch (_) {
      // Offline, or a database without 20_scene_turns.sql: nothing to show.
      return;
    }
    if (request === requestRef.current) setTurns(fresh);
  }, [sceneId]);

  useEffect(() => {
    setTurns(null);
    reload();
    return () => { requestRef.current += 1; };
  }, [reload]);

  const handleEvent = useCallback((payload) => {
    requestRef.current += 1;
    if (String(payload?.eventType || '').toUpperCase() === 'DELETE') {
      setTurns(null);
      return;
    }
    const next = toSceneTurns(payload?.new);
    if (next) setTurns(next);
  }, []);

  // The GM's choice of fight, or `null` to show none. Throws to the caller,
  // which says so.
  const choose = useCallback(async (choice) => {
    if (!isGm || !sceneId) return;
    requestRef.current += 1;
    const saved = await setSceneTurnFight(sceneId, choice);
    setTurns(saved);
  }, [isGm, sceneId]);

  return { turns, reload, handleEvent, choose };
}
