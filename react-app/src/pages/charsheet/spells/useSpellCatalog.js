import { useEffect, useState } from 'react';
import { loadClassAdapters, loadCoreAdapters, loadSpellsAdapters } from '../../../adapters/index.js';
import { loadSpells } from '../../../shared/content/catalogs/spellData.js';

// The spell catalog and adapters the spell tab reads. `adapterRevision` moves
// each time the class/spell adapters finish loading, so derived spell data is
// rebuilt. Only the class names restart the adapter load: attunement and other
// character edits must not cancel or restart it.
export function useSpellCatalog(classNameList) {
  const [spellDb, setSpellDb] = useState([]);
  const [spellVersions, setSpellVersions] = useState([]);
  const [classSpellIndex, setClassSpellIndex] = useState({});
  const [catalogStatus, setCatalogStatus] = useState('loading');
  const [adapterRevision, setAdapterRevision] = useState(0);
  const classKey = JSON.stringify(classNameList);

  useEffect(() => {
    let alive = true;
    Promise.all([
      loadCoreAdapters(),
      loadClassAdapters(JSON.parse(classKey)),
      loadSpellsAdapters(),
    ]).then(() => {
      if (!alive) return;
      setAdapterRevision((revision) => revision + 1);
    }).catch(() => {
      // Keep the available catalog usable if an adapter cannot be loaded.
    });
    return () => { alive = false; };
  }, [classKey]);

  useEffect(() => {
    let alive = true;
    setCatalogStatus('loading');
    const load = async () => {
      // Successful files are cached by the loader; the second attempt retries
      // only failed requests, without discarding already available spell data.
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const result = await loadSpells();
          if (!alive) return;
          setSpellDb(result.spells || []);
          setSpellVersions(result.spellVersions || result.spells || []);
          setClassSpellIndex(result.classSpellIndex || {});
          if (!result.failedFiles?.length) {
            setCatalogStatus('ready');
            return;
          }
        } catch {
          if (!alive) return;
        }
      }
      setCatalogStatus('error');
    };
    load();
    return () => { alive = false; };
  }, []);

  return { spellDb, spellVersions, classSpellIndex, catalogStatus, adapterRevision };
}
