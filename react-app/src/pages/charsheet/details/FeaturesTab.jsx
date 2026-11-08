import { Box } from '@mui/material';
import { entriesToTextBlocks } from '../../../shared/content/entryText.js';
import { backgroundFeatNames } from '../../../shared/character/progression/selectedFeats.js';
import { featDescriptionEntries } from '../../../shared/character/progression/featDescription.js';

import { ENTITY_COLORS as SOURCE_COLOR } from '../../../shared/ui/entityColors.js';
import { asArray } from '../../../shared/lists.js';
import { collectWarlockInvocationFeatures, collectClassBuckets } from './featuresTabData.js';
import { FeatureSection } from './FeatureSection.jsx';
import { extractFixedProficiencyLabels } from '../../../shared/character/progression/typedProficiencies.js';

export default function FeaturesTab({ C }) {
  if (!C) return null;

  const classBuckets = collectClassBuckets(C);
  const invocationFeatures = collectWarlockInvocationFeatures(C);
  const speciesEntries = C?.speciesSnapshot?.entries || [];
  const backgroundSnapshot = C?.backgroundSnapshot || {};
  const backgroundEntries = backgroundSnapshot.entries || [];
  const backgroundFeats = [
    ...backgroundFeatNames(backgroundSnapshot),
    ...(C?.choices?.feat_origin ? [C.choices.feat_origin] : []),
  ];
  const selectedFeats = C?.allFeatSnapshots || [];

  function renderBackgroundEntries() {
    const out = [];
    if (backgroundEntries.length) {
      const raw = asArray(backgroundEntries);
      raw.forEach(e => {
        if (entriesToTextBlocks(e).length) out.push(e);
      });
    }

    const backgroundChoices = {};
    if (C?.choices) {
      Object.entries(C.choices).forEach(([k, v]) => {
        if (!k.startsWith('bg_')) return;
        const vals = asArray(v);
        if (k.includes('skill')) backgroundChoices.skills = [...(backgroundChoices.skills || []), ...vals];
        else if (k.includes('tool') || k.includes('instrument')) backgroundChoices.tools = [...(backgroundChoices.tools || []), ...vals];
        else if (k.includes('language')) backgroundChoices.languages = [...(backgroundChoices.languages || []), ...vals];
      });
    }

    const fixedSkills = extractFixedProficiencyLabels(backgroundSnapshot.skillProficiencies);
    const allSkills = [...new Set([...fixedSkills, ...(backgroundChoices.skills || [])])];
    const fixedTools = extractFixedProficiencyLabels(backgroundSnapshot.toolProficiencies);
    const allTools = [...new Set([...fixedTools, ...(backgroundChoices.tools || [])])];
    const fixedLangs = extractFixedProficiencyLabels(backgroundSnapshot.languageProficiencies);
    const allLangs = [...new Set([...fixedLangs, ...(backgroundChoices.languages || [])])];

    const grants = [];
    const backgroundAbilities = C?.backgroundAbilities || [];
    const backgroundPattern = C?.backgroundPattern || [2, 1];
    if (backgroundAbilities.length) {
      const abilLabels = { str: 'Str', dex: 'Dex', con: 'Con', int: 'Int', wis: 'Wis', cha: 'Cha' };
      const abilStr = backgroundAbilities.map((stat, i) => `${abilLabels[stat] || stat}+${backgroundPattern[i] || 0}`).join(', ');
      grants.push(`Ability Scores: ${abilStr}`);
    }
    if (allSkills.length) grants.push(`Skills: ${allSkills.join(', ')}`);
    if (allTools.length) grants.push(`Tools: ${allTools.join(', ')}`);
    if (allLangs.length) grants.push(`Languages: ${allLangs.join(', ')}`);
    if (backgroundFeats.length) grants.push(`Feat: ${[...new Set(backgroundFeats)].join(', ')}`);

    if (grants.length) {
      out.push({ type: 'list', items: grants });
    }
    return out;
  }

  return (
    <Box>
      {classBuckets.map((bucket, index) => (
        <FeatureSection
          key={`${bucket.kind}-${bucket.name}-${bucket.index ?? 'primary'}-${index}`}
          title={bucket.title}
          color={SOURCE_COLOR.class}
          features={bucket.features}
        />
      ))}

      <FeatureSection
        title="Eldritch Invocations"
        color={SOURCE_COLOR.class}
        features={invocationFeatures}
      />

      <FeatureSection
        title={`Species - ${C?.speciesName || '?'}`}
        color={SOURCE_COLOR.species}
        features={speciesEntries?.length ? [{
          name: C?.speciesName || 'Species',
          level: 1,
          entries: speciesEntries,
          source: 'Species',
        }] : []}
      />

      {C?.backgroundName ? (
        <FeatureSection
          title={`Background - ${C.backgroundName}`}
          color={SOURCE_COLOR.background}
          features={[{
            name: C.backgroundName,
            level: 1,
            entries: renderBackgroundEntries(),
            source: 'Background',
          }]}
        />
      ) : null}

      <FeatureSection
        title="Feats"
        color={SOURCE_COLOR.feat}
        features={selectedFeats.map((feat) => ({
          name: feat.name,
          level: null,
          entries: featDescriptionEntries(feat),
          source: 'Feat',
        }))}
      />
    </Box>
  );
}

