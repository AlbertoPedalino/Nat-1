import {
  BACKGROUND_ALLOWED_SOURCES,
  FEAT_ALLOWED_SOURCES,
  SPECIES_ALLOWED_SOURCES,
  isAllowedSource,
} from '../../../shared/content/sourcePriority.js';
import { loadGameData } from '../../../shared/content/gameData.js';

// The species, backgrounds and feats a character picks from.

export async function loadSpecies() {
  const data = await loadGameData('races.json');
  return (data.race || data.species || [])
    .filter((species) => isAllowedSource(species.source, SPECIES_ALLOWED_SOURCES))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadBackgrounds() {
  const [data, fluffData] = await Promise.allSettled([
    loadGameData('backgrounds.json'),
    loadGameData('fluff-backgrounds.json'),
  ]);
  const backgrounds = (data.status === 'fulfilled' ? (data.value.background || []) : [])
    .filter((background) => isAllowedSource(background.source, BACKGROUND_ALLOWED_SOURCES));
  // Upstream data bug: Genie Touched (FRHoF) omits the structured `feats` field;
  // its origin feat lives only in prose `entries`. Restore the machine-readable
  // grant so the builder/sheet resolve Magic Initiate (Wizard) like other bgs.
  backgrounds.forEach((bg) => {
    if (bg.name === 'Genie Touched' && bg.source === 'FRHoF' && !bg.feat && !bg.feats) {
      bg.feats = [{ 'magic initiate; wizard|xphb': true }];
    }
  });
  if (fluffData.status === 'fulfilled') {
    const fluffIndex = {};
    (fluffData.value.backgroundFluff || []).forEach((entry) => {
      const key = `${entry.name}_${entry.source}`;
      if (entry.entries?.length) {
        const first = entry.entries[0];
        fluffIndex[key] = typeof first === 'string' ? first : (first?.entries?.[0] || '');
      }
    });
    backgrounds.forEach((bg) => {
      const key = `${bg.name}_${bg.source}`;
      if (fluffIndex[key]) bg._lore = fluffIndex[key];
    });
  }
  return backgrounds.sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadFeats() {
  const data = await loadGameData('feats.json');
  return (data.feat || [])
    .filter((feat) => isAllowedSource(feat.source, FEAT_ALLOWED_SOURCES))
    .sort((a, b) => a.name.localeCompare(b.name));
}
