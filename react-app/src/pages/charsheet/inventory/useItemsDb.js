import { useLoaded } from '../../../shared/ui/useLoaded.js';
import { loadItemsCached } from '../../../shared/character/inventory/itemSearch.js';

const NO_ITEMS = [];

// The item list the sheet's panels look items up in: loaded once for every
// panel (loadItemsCached), empty until it arrives or if it cannot load.
export function useItemsDb() {
  return useLoaded(loadItemsCached, [], { initial: NO_ITEMS }).data;
}
