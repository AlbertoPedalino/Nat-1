import { useEffect, useRef, useState } from 'react';
import { readPersistedInstance } from '../../encounterbuilder/state/storage.js';
import { CLOUD_STATES, followInstanceData, listInstances } from '../../../shared/instances/instanceStore.js';
import { listToolInstances, pullInstance, refreshInstance } from '../../../shared/instances/instanceSync.js';

// The GM's Encounter Builder saves, in this browser and in the cloud, and the
// fights and library of the one picked. The payload is always read from the
// local copy, which is what the builder writes and what the fights restore
// from; the cloud decides which saves are on offer and keeps those copies
// current:
// - a save only in the cloud is pulled down when it is picked, so the one
//   prepared on another machine imports here too;
// - a local copy linked to the cloud is fast-forwarded if the cloud moved on
//   and nothing here is unsynced;
// - a local-only save is read as it is.
// Offline, or with the cloud unreachable, the list is this browser's saves.
export function useEncounterSaves(open) {
  const [instanceId, setInstanceId] = useState('');
  const [instances, setInstances] = useState([]);
  const [fights, setFights] = useState([]);
  const [library, setLibrary] = useState([]);
  const [listNotice, setListNotice] = useState('');
  // True until the cloud has answered: an empty list before then is not yet
  // "no saves", only "none in this browser".
  const [listing, setListing] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fetchNotice, setFetchNotice] = useState('');
  // Each save is asked of the cloud once per opening of the dialog: switching
  // back to it, or the list refreshing under it, is not a reason to ask again.
  const fetchedRef = useRef(new Set());
  // Until the GM picks a save, the newest one is shown — including one the
  // cloud list brings in after this browser's own were already on screen.
  const pickedRef = useRef(false);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    fetchedRef.current = new Set();
    pickedRef.current = false;
    const apply = (rows) => {
      const list = [...rows].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      setInstances(list);
      setInstanceId((current) => (
        pickedRef.current && list.some((entry) => entry.id === current) ? current : list[0]?.id || ''
      ));
    };
    // This browser's saves at once; the cloud's join them when it answers.
    apply(listInstances('encounters').map((entry) => ({
      ...entry, origin: 'local', hasLocal: true, cloudState: entry.cloud,
    })));
    setListNotice('');
    setListing(true);
    const unreachable = 'Could not reach the cloud: showing the saves in this browser.';
    listToolInstances('encounters')
      .then(({ rows, error }) => {
        if (cancelled) return;
        apply(rows);
        if (error) setListNotice(unreachable);
      })
      .catch(() => {
        if (!cancelled) setListNotice(unreachable);
      })
      .finally(() => { if (!cancelled) setListing(false); });
    return () => { cancelled = true; };
  }, [open]);

  const selectedInstance = instances.find((entry) => entry.id === instanceId) || null;
  const cloudOnly = Boolean(selectedInstance && !selectedInstance.hasLocal);
  const linked = Boolean(selectedInstance?.hasLocal && selectedInstance.cloudState === CLOUD_STATES.LINKED);

  useEffect(() => {
    setFetchNotice('');
    if (!open || !instanceId || (!cloudOnly && !linked)) return undefined;
    if (fetchedRef.current.has(instanceId)) return undefined;
    fetchedRef.current.add(instanceId);
    let cancelled = false;
    // Only a save with nothing here to show waits on the cloud; a linked copy is
    // shown as it is while it is brought up to date. Either way the new payload
    // reaches the reader below through the store's 'pulled' notice.
    if (cloudOnly) setFetching(true);
    const id = instanceId;
    const job = cloudOnly
      ? pullInstance('encounters', id).then(() => 'pulled')
      : refreshInstance('encounters', id);
    job
      .then((result) => {
        // Downloaded is local now, whether or not it is still the one on show.
        if (cloudOnly) {
          setInstances((list) => list.map((entry) => (entry.id === id
            ? { ...entry, hasLocal: true, cloudState: CLOUD_STATES.LINKED }
            : entry)));
        }
        if (!cancelled && result === 'conflict') {
          setFetchNotice('This save changed here and in the cloud. Open it in the Encounter Builder to choose; importing from the copy in this browser.');
        }
      })
      .catch(() => {
        // Let it be tried again the next time it is picked, even if the GM has
        // moved on to another save meanwhile.
        fetchedRef.current.delete(id);
        if (cancelled) return;
        setFetchNotice(cloudOnly
          ? 'Could not download this save from the cloud.'
          : 'Could not check the cloud for a newer copy; importing from this browser.');
      })
      .finally(() => { if (!cancelled) setFetching(false); });
    return () => {
      cancelled = true;
      setFetching(false);
    };
  }, [cloudOnly, instanceId, linked, open]);

  // Read every time the dialog is opened, and again whenever the builder writes.
  //
  // Read once and held was the bug: this tab and the builder are two tabs of one
  // browser, and a map left open since before tonight's prep offered whatever
  // the instance held when it was first opened — an encounter saved since was
  // simply not on the list. The instance store's feed covers the builder in
  // this tab, and `storage` covers it in any other.
  useEffect(() => {
    if (!open || !instanceId) {
      if (!instanceId) {
        setFights([]);
        setLibrary([]);
      }
      return undefined;
    }
    const read = () => {
      const persisted = readPersistedInstance(instanceId, []);
      setFights(persisted?.fightsData?.items || []);
      setLibrary(persisted?.library || []);
    };
    read();
    return followInstanceData('encounters', instanceId, read);
  }, [instanceId, open]);

  // A save the GM chose stays chosen when the cloud list lands under it.
  const pickInstance = (id) => {
    pickedRef.current = true;
    setInstanceId(id);
  };

  return {
    instances,
    instanceId,
    pickInstance,
    listNotice,
    listing,
    fetching,
    fetchNotice,
    fights,
    library,
  };
}
