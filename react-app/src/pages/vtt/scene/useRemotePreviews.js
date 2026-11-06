import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  dropGhost,
  pruneGhosts,
  putGhost,
  settleGhost,
} from '../../../shared/vtt/session/liveScene.js';
import { REMOTE_MEASURE_TTL_MS } from '../../../shared/vtt/map/measureSync.js';

const GHOST_SWEEP_MS = 2000;
const LASER_TTL_MS = 2500;

// What the other screens at the table are showing right now and nobody stores:
// the pieces they are dragging (ghosts), their laser dots and their ruler.
// `receivePreview` takes a broadcast that is none of the other kinds;
// `settleTokenGhost` lets a committed row replace its drag preview.
export function useRemotePreviews({ role, roster }) {
  const [ghosts, setGhosts] = useState({});
  const [lasers, setLasers] = useState({});
  const [remoteMeasure, setRemoteMeasure] = useState(null);

  // Who a broadcast came from, in words. The campaign's sheets carry their
  // owner's username, which is the only name this page ever learns.
  const nameForActor = useCallback((actor) => {
    if (!actor) return 'Someone';
    if (actor === role.gmId) return 'GM';
    const entry = roster.find((item) => item.ownerId === actor);
    return entry?.ownerUsername || entry?.name || 'Player';
  }, [role.gmId, roster]);

  // Read through a ref: the realtime handler is registered once, and closing
  // over the roster would leave it naming people from an empty list.
  const nameForRef = useRef(nameForActor);
  nameForRef.current = nameForActor;

  const receivePreview = useCallback((payload) => {
    // The ruler is shown to the table while it is dragged and stored nowhere,
    // exactly like the laser.
    if (payload.measure !== undefined) {
      // Stamped on arrival: the sweep below drops a ruler whose owner stopped
      // refreshing it (a closed tab never sends its release).
      setRemoteMeasure(payload.measure ? { ...payload.measure, receivedAt: Date.now() } : null);
      return;
    }

    if (payload.laser !== undefined) {
      const actor = payload.actor || 'someone';
      setLasers((current) => {
        if (!payload.laser) {
          const next = { ...current };
          delete next[actor];
          return next;
        }
        return {
          ...current,
          [actor]: { ...payload.laser, at: Date.now(), label: nameForRef.current(actor) },
        };
      });
      return;
    }
    setGhosts((current) => putGhost(current, payload));
  }, []);

  const settleTokenGhost = useCallback((payload) => {
    const id = payload?.new?.id || payload?.old?.id;
    // The row the drop wrote supersedes the drag preview once the drag is over;
    // a removed piece takes its ghost with it at once.
    const removed = String(payload?.eventType || payload?.type || '').toUpperCase() === 'DELETE';
    if (id) {
      setGhosts((current) => (removed ? dropGhost(current, id) : settleGhost(current, id, payload?.new)));
    }
  }, []);

  // A client that vanishes mid-drag never sends its release; sweeping keeps its
  // piece from being pinned at the ghost position forever.
  useEffect(() => {
    const timer = setInterval(() => {
      setGhosts((current) => pruneGhosts(current));
      setRemoteMeasure((current) => (
        current && Date.now() - current.receivedAt > REMOTE_MEASURE_TTL_MS ? null : current
      ));
      // A laser nobody is holding any more: same sweep, shorter patience,
      // because a stale dot reads as a live one.
      setLasers((current) => {
        const now = Date.now();
        const entries = Object.entries(current).filter(([, dot]) => now - dot.at < LASER_TTL_MS);
        return entries.length === Object.keys(current).length ? current : Object.fromEntries(entries);
      });
    }, GHOST_SWEEP_MS);
    return () => clearInterval(timer);
  }, []);

  const laserDots = useMemo(() => (
    Object.entries(lasers).map(([id, dot]) => ({ ...dot, id }))
  ), [lasers]);

  return {
    ghosts, setLasers, laserDots, remoteMeasure, receivePreview, settleTokenGhost,
  };
}
