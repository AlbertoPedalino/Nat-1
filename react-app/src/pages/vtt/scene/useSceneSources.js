import { useCampaignRoster } from './useCampaignRoster.js';
import { useCharacterHealth } from './useCharacterHealth.js';
import { useGmTokenVitals } from '../tokens/useGmTokenVitals.js';
import { useSceneTurns } from '../initiative/useSceneTurns.js';
import { useSceneHexcrawl } from '../hexcrawl/useSceneHexcrawl.js';
import { useSceneDungeon } from '../dungeon/useSceneDungeon.js';
import { useMonsterDb } from '../../../shared/bestiary/useMonsterDb.js';

// What the scene reads besides its own pieces and marks: the campaign's
// characters, the GM's private vitals, the fight on show, the hexcrawl, the
// dungeon and the bestiary they draw on. `gmWindow` is the GM's own editor —
// never a player, never the projector tab, even when the GM opened it.
export function useSceneSources({ scene, tokens, gmWindow }) {
  const { roster, digests: rosterDigests, baseMax: rosterBaseMax } = useCampaignRoster(scene.campaignId);
  const characterHealth = useCharacterHealth(rosterDigests, rosterBaseMax);
  // Public rows carry hit points only while a bar is shown; the GM reads the
  // real ones from the private sources and sees them overlaid at render.
  const gmVitals = useGmTokenVitals({ sceneId: scene.id, tokens, enabled: gmWindow });
  // Which fight the scene shows as its initiative. The turn itself is that
  // fight's; players see it through the pieces (turn_order / turn_active).
  const sceneTurns = useSceneTurns({ sceneId: scene.id, isGm: gmWindow });
  // Dormant on a square map: it asks the database for nothing until the scene
  // is actually a hexcrawl. A player and the projector read it — the colours and
  // the party marker are the map everyone is looking at — but only the GM's own
  // window may run it, which is why the projector tab is not one even when it is
  // the GM who opened it.
  const hexcrawl = useSceneHexcrawl({ scene, isGm: gmWindow });
  // After the roster, which sizes the encounters it buys. The bestiary is
  // already loaded for the monster picker; the dungeon uses it to turn a rolled
  // budget in experience into creatures.
  const monsterDb = useMonsterDb();
  const dungeon = useSceneDungeon({
    scene,
    isGm: gmWindow,
    monsters: monsterDb.monsters,
    partySize: Math.max(1, roster.length || 4),
    // Not only to size the encounter: a fight sent to the builder takes the
    // party's colours and portraits from these sheets.
    roster,
  });

  return {
    roster,
    rosterDigests,
    characterHealth,
    gmVitals,
    sceneTurns,
    hexcrawl,
    monsterDb,
    dungeon,
  };
}
