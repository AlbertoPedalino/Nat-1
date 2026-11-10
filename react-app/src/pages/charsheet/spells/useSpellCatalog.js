import { useEffect, useState } from 'react';
import { ensureClassAdapters } from '../../../shared/character/sheet/sheetRuntimeAdapters.js';
import { loadSpells } from '../../../shared/content/catalogs/spellData.js';

// The spell catalog and adapters the spell tab reads. `adapterRevision` moves
// each time the class/spell adapters finish loading, so derived spell data is
// rebuilt. Only the class names restart the adapter load: attunement and other
// character edits must not cancel or restart it.
export function useSpellCatalog(classNameList) {
  const [spellDb, setSpellDb] = useState([]);
  const [spellVersions, setSpellVersions] = useState([]);
  const [classSpellIndex, setClassSpellIndex] = useState({});
  const [classSpellBooks, setClassSpellBooks] = useState(null);
  const [catalogStatus, setCatalogStatus] = useState('loading');
  const [adapterRevision, setAdapterRevision] = useState(0);
  const classKey = JSON.stringify(classNameList);

  useEffect(() => {
    let alive = true;
    // Whatever loaded (a failed chunk only leaves its adapter out), the
    // derived spell data is rebuilt.
    ensureClassAdapters(JSON.parse(classKey), { spells: true }).then(() => {
      if (alive) setAdapterRevision((revision) => revision + 1);
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
          setClassSpellBooks(result.classSpellBooks || null);
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

  return { spellDb, spellVersions, classSpellIndex, classSpellBooks, catalogStatus, adapterRevision };
}
