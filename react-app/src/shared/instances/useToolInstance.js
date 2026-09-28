import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../cloud/auth/AuthProvider.jsx';
import { useToast } from '../ui/ToastProvider.jsx';
import { getSection, sanitizeInstanceId } from './sectionRegistry.js';
import { normalizeLinkGroupId } from './linkGroupId.js';
import {
  CLOUD_STATES,
  createInstance,
  getActiveInstanceId,
  getInstance,
  setActiveInstance,
  subscribeInstances,
} from './instanceStore.js';
import {
  getSyncState,
  isInstanceSyncOnline,
  openInstance,
  refreshInstance,
  resolveConflict,
  subscribeInstanceSyncAvailability,
} from './instanceSync.js';

function useInstanceSyncOnline() {
  return useSyncExternalStore(subscribeInstanceSyncAvailability, isInstanceSyncOnline, () => false);
}

// What the URL asks for: `?<param>=new` mints an instance, `?<param>=<id>`
// opens one, no param reopens the last active instance (or mints one).
function requestFrom(section, search) {
  const params = new URLSearchParams(search || '');
  const requested = sanitizeInstanceId(params.get(section.param));
  const linkGroupId = normalizeLinkGroupId(params.get('linkGroup'));
  if (requested === 'new') return { mint: true, linkGroupId };
  if (requested) return { id: requested, linkGroupId };
  const active = sanitizeInstanceId(getActiveInstanceId(section.key));
  if (active && getInstance(section.key, active)) return { id: active, linkGroupId, replace: true };
  return { mint: true, linkGroupId };
}

// The single entry point of a tool page (GM Board, Encounter Builder, DM
// Screen). It resolves the instance from the URL and opens it:
// - a known local copy (or one minted here) opens at once; if it is linked and
//   the cloud is reachable, it is refreshed in the background (fast-forwarded
//   when the cloud moved on and nothing here is unsynced);
// - an unknown id waits for auth, then asks the cloud: an existing row is
//   pulled, a missing one is created locally; offline, a local copy is used
//   that can only ever INSERT.
// The page mounts its editor when `ready`, keyed by `revision` (bumped when a
// pull replaced the copy on screen), and shows the conflict banner.
export function useToolInstance(sectionKey) {
  const section = getSection(sectionKey);
  const location = useLocation();
  const navigate = useNavigate();
  const { cloudEnabled, status } = useAuth();
  const { notify } = useToast();
  const online = useInstanceSyncOnline();
  const authPending = Boolean(cloudEnabled) && (status === 'loading' || (status === 'authed' && !online));
  const [current, setCurrent] = useState(null);
  const [gate, setGate] = useState({ id: null, ready: false, revision: 0 });
  const [, setTick] = useState(0);
  const mintedRef = useRef(new Map());
  const checkedRef = useRef(new Set());
  const gateRef = useRef(gate);
  gateRef.current = gate;

  useEffect(() => {
    const request = requestFrom(section, location.search);
    let { id } = request;
    let fresh = false;
    if (request.mint) {
      // Remembered per URL, so a re-run for the same `?param=new` (StrictMode)
      // does not mint a second instance.
      id = mintedRef.current.get(location.search);
      if (!id) {
        const entry = createInstance(sectionKey, { linkGroupId: request.linkGroupId });
        if (!entry) {
          notify('error', `${section.label} could not be saved on this device.`);
          return;
        }
        id = entry.id;
        mintedRef.current.set(location.search, id);
      }
      fresh = true;
    }
    if (request.mint || request.replace) {
      navigate({ pathname: location.pathname, search: `?${section.param}=${encodeURIComponent(id)}` }, { replace: true });
    }
    setCurrent((previous) => (previous?.id === id ? previous : { id, fresh, linkGroupId: request.linkGroupId }));
  }, [location.pathname, location.search, navigate, notify, section, sectionKey]);

  useEffect(() => {
    if (!current) return undefined;
    const { id, fresh } = current;
    let cancelled = false;
    const markReady = () => {
      if (cancelled) return;
      setActiveInstance(sectionKey, id);
      setGate((previous) => (previous.id === id && previous.ready ? previous : { id, ready: true, revision: 0 }));
    };
    const wasShown = () => gateRef.current.id === id && gateRef.current.ready;
    const onPulled = (outcome) => {
      if (outcome === 'pulled' && wasShown()) notify('info', 'The cloud copy of this instance is now open.');
    };
    const entry = getInstance(sectionKey, id);
    const known = Boolean(entry) && entry.cloud !== CLOUD_STATES.LOCAL;
    if (fresh || known) {
      markReady();
      if (known && online && !checkedRef.current.has(`refresh:${id}`)) {
        checkedRef.current.add(`refresh:${id}`);
        refreshInstance(sectionKey, id).then(onPulled, () => {});
      }
      return () => { cancelled = true; };
    }
    if (authPending) return () => { cancelled = true; };
    const mode = online ? `open:${id}` : `offline:${id}`;
    if (checkedRef.current.has(mode)) {
      markReady();
      return () => { cancelled = true; };
    }
    checkedRef.current.add(mode);
    openInstance(sectionKey, id, { linkGroupId: current.linkGroupId })
      .then((outcome) => { onPulled(outcome); markReady(); }, () => markReady());
    return () => { cancelled = true; };
  }, [authPending, current, notify, online, sectionKey]);

  const id = current?.id || '';
  useEffect(() => {
    if (!id) return undefined;
    return subscribeInstances((event) => {
      if (event.sectionKey !== sectionKey || event.id !== id) return;
      if (event.kind === 'pulled') {
        setGate((previous) => (previous.id === id && previous.ready ? { ...previous, revision: previous.revision + 1 } : previous));
      }
      setTick((tick) => tick + 1);
    });
  }, [id, sectionKey]);

  const resolve = useCallback(async (choice) => {
    try {
      await resolveConflict(sectionKey, id, choice);
    } catch (error) {
      notify('error', error?.message || 'Could not resolve the conflict.');
    }
  }, [id, notify, sectionKey]);

  const entry = id ? getInstance(sectionKey, id) : null;
  const ready = gate.id === id && gate.ready && Boolean(entry);
  return {
    id,
    ready,
    revision: gate.id === id ? gate.revision : 0,
    name: entry?.name || '',
    linkGroupId: entry?.linkGroupId || null,
    syncState: id ? getSyncState(sectionKey, id) : null,
    conflict: entry?.conflict || null,
    online,
    resolveConflict: resolve,
  };
}
