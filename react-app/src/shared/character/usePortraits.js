import { useEffect, useMemo, useState } from 'react';
import { loadPortrait } from '../cloud/characterArt.js';
import { readPortrait } from './portrait.js';

// The pictures for a set of portrait paths, keyed by path.
//
// The local copy is read while rendering, not in an effect: it is already in
// hand, and going through a state update to use it would blank the face for a
// frame every time a sheet or a scene re-rendered. Only a portrait that is not
// held locally costs anything, and only once.

export function usePortraits(paths) {
  // A stable key, so a caller may pass a fresh array on every render — which
  // anything mapping over a roster inevitably does.
  const wanted = useMemo(
    () => [...new Set((paths || []).filter(Boolean))].sort(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [(paths || []).filter(Boolean).sort().join('|')],
  );

  const [fetched, setFetched] = useState({});

  const known = useMemo(() => {
    const urls = {};
    for (const path of wanted) {
      const url = readPortrait(path) || fetched[path];
      if (url) urls[path] = url;
    }
    return urls;
  }, [fetched, wanted]);

  useEffect(() => {
    const missing = wanted.filter((path) => !known[path]);
    if (!missing.length) return undefined;

    let cancelled = false;
    Promise.all(missing.map(async (path) => {
      try {
        return [path, await loadPortrait(path)];
      } catch {
        // A portrait that will not load leaves the piece wearing its colour,
        // which is what it wore before anybody uploaded anything.
        return [path, null];
      }
    })).then((loaded) => {
      if (cancelled) return;
      const found = Object.fromEntries(loaded.filter(([, url]) => url));
      if (Object.keys(found).length) setFetched((current) => ({ ...current, ...found }));
    });

    return () => { cancelled = true; };
    // `known` is deliberately absent: it changes as portraits arrive, and
    // depending on it would start this again for the ones still missing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted]);

  return known;
}

export function usePortrait(path) {
  const paths = useMemo(() => (path ? [path] : []), [path]);
  return usePortraits(paths)[path] || null;
}
