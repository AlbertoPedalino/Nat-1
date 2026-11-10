import { useState } from 'react';

// Which active conditions have their rules card open, for the pills of a sheet
// or a combatant. The open cards are read off the live active list, so a
// condition removed takes its card with it — no stale state to prune.
export function useOpenConditionCards(activeKeys, conditionEntries) {
  const [expanded, setExpanded] = useState([]);
  const hasDesc = (key) => Boolean(conditionEntries?.[key]?.length);
  return {
    hasDesc,
    isOpen: (key) => expanded.includes(key),
    toggleCard: (key) => setExpanded((prev) => (
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )),
    openKeys: (activeKeys || []).filter((key) => expanded.includes(key) && hasDesc(key)),
  };
}
