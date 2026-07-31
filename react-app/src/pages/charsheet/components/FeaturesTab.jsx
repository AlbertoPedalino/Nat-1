import { useState } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { installedRegistry } from '../../../adapters/index.js';
import { warlockInvocationSelections } from '../../../shared/character/warlockUtils.js';
import { buildOptionalFeatureEntryLookup } from '../../../shared/character/optionalFeatures.js';
import CollapsibleBody from '../../../shared/character/CollapsibleBody.jsx';
import { EntryBlocks } from '../../../shared/character/EntryBlocks.jsx';
import { entriesToTextBlocks } from '../../../shared/character/spellEntries.js';
import { backgroundFeatNames } from '../../../shared/character/selectedFeats.js';
import { primaryClassLevel } from '../../../shared/character/classLevel.js';

import { ENTITY_COLORS as SOURCE_COLOR } from '../../../shared/entityColors.js';

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
      const raw = Array.isArray(backgroundEntries) ? backgroundEntries : [backgroundEntries];
      raw.forEach(e => {
        if (entriesToTextBlocks(e).length) out.push(e);
      });
    }

    const backgroundChoices = {};
    if (C?.choices) {
      Object.entries(C.choices).forEach(([k, v]) => {
        if (!k.startsWith('bg_')) return;
        const vals = Array.isArray(v) ? v : [v];
        if (k.includes('skill')) backgroundChoices.skills = [...(backgroundChoices.skills || []), ...vals];
        else if (k.includes('tool') || k.includes('instrument')) backgroundChoices.tools = [...(backgroundChoices.tools || []), ...vals];
        else if (k.includes('language')) backgroundChoices.languages = [...(backgroundChoices.languages || []), ...vals];
      });
    }

    function titleCase(v) { return v.charAt(0).toUpperCase() + v.slice(1).toLowerCase(); }
    const fixedSkills = (backgroundSnapshot.skillProficiencies || []).flatMap(sp => Object.keys(sp).filter(k => k !== 'choose' && !k.startsWith('any'))).map(titleCase);
    const allSkills = [...new Set([...fixedSkills, ...(backgroundChoices.skills || [])])];
    const fixedTools = (backgroundSnapshot.toolProficiencies || []).flatMap(tp => Object.keys(tp).filter(k => k !== 'choose' && !k.startsWith('any')));
    const allTools = [...new Set([...fixedTools, ...(backgroundChoices.tools || [])])];
    const fixedLangs = (backgroundSnapshot.languageProficiencies || []).flatMap(lp => Object.keys(lp).filter(k => k !== 'choose' && !k.startsWith('any')));
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
          entries: feat.entries || [],
          source: 'Feat',
        }))}
      />
    </Box>
  );
}

function collectWarlockInvocationFeatures(C) {
  const meta = typeof installedRegistry.getClassSheetChoiceMeta === 'function'
    ? (installedRegistry.getClassSheetChoiceMeta('Warlock') || {})
    : {};
  const invocationData = Array.isArray(meta?.invocationData) ? meta.invocationData : [];
  if (!invocationData.length) return [];

  const invByName = new Map(
    invocationData.map((entry) => [norm(entry?.name), entry]).filter(([key]) => key),
  );
  // Live 2024 invocation descriptions (rich 5etools entries) from optionalfeatures.json.
  const liveEntries = buildOptionalFeatureEntryLookup(C?.optionalFeatureEntries, 'EI');
  const out = [];
  const pushForPrefix = (keyPrefix, ownerLevel = 1) => {
    const selected = warlockInvocationSelections(C, keyPrefix);
    if (!selected.length) return;
    const counts = new Map();
    selected.forEach((name) => {
      const clean = cleanChoiceText(name);
      if (!clean) return;
      counts.set(clean, (counts.get(clean) || 0) + 1);
    });
    counts.forEach((count, selectedName) => {
      const data = invByName.get(norm(selectedName)) || null;
      const repeatable = !!data?.repeatable;
      out.push({
        name: count > 1 ? `${selectedName} x${count}` : selectedName,
        level: Number(data?.minLevel || ownerLevel || 1),
        source: repeatable ? 'Invocation - Repeatable' : 'Invocation',
        sourceKind: 'class',
        entries: liveEntries(selectedName) || null,
      });
    });
  };

  if (norm(C?.className) === 'warlock') pushForPrefix('', primaryClassLevel(C));
  (C?.extraClasses || []).forEach((extra, index) => {
    if (norm(extra?.name) !== 'warlock') return;
    pushForPrefix(`mc${index}_`, Number(extra?.level || 1));
  });

  return dedupeFeatures(out);
}

function collectClassBuckets(C) {
  const out = [];
  const primaryLevel = getPrimaryClassLevel(C);

  if (C?.className) {
    const classFeatures = collectValidClassFeatures({
      features: C?.allClassFeatures || C?.allFeatures || [],
      className: C.className,
      level: primaryLevel,
      character: C,
      choicePrefix: '',
    }).map((feature) => ({ ...feature, source: C.className || 'Class', sourceKind: 'class' }));

    const subclassFeatures = collectValidSubclassFeatures({
      features: C?.allSubFeatures || [],
      className: C.className,
      subclassName: C?.subclassShortName || '',
      level: primaryLevel,
      character: C,
      choicePrefix: '',
    }).map((feature) => ({ ...feature, source: C.subclassShortName || 'Subclass', sourceKind: 'subclass' }));

    out.push({
      kind: 'class',
      name: C.className,
      title: `${C.className} ${primaryLevel}${C?.subclassShortName ? ` - ${C.subclassShortName}` : ''}`,
      index: null,
      features: dedupeFeatures([...classFeatures, ...subclassFeatures]),
    });
  }

  (C?.extraClasses || []).forEach((extra, index) => {
    if (!extra?.name) return;
    const level = Number(extra?.level || 1);
    const choicePrefix = `mc${index}_`;

    const classFeatures = collectValidClassFeatures({
      features: extra?.allClassFeatures || extra?.allFeatures || [],
      className: extra.name,
      level,
      character: C,
      choicePrefix,
    }).map((feature) => ({ ...feature, source: extra.name || 'Class', sourceKind: 'class' }));

    const subclassFeatures = collectValidSubclassFeatures({
      features: extra?.allSubFeatures || [],
      className: extra.name,
      subclassName: extra?.subclassShortName || '',
      level,
      character: C,
      choicePrefix,
    }).map((feature) => ({ ...feature, source: extra.subclassShortName || 'Subclass', sourceKind: 'subclass' }));

    out.push({
      kind: 'multiclass',
      name: extra.name,
      title: `MC ${index + 1} - ${extra.name} ${level}${extra?.subclassShortName ? ` - ${extra.subclassShortName}` : ''}`,
      index,
      features: dedupeFeatures([...classFeatures, ...subclassFeatures]),
    });
  });

  return out.filter((bucket) => bucket.features.length);
}

function collectValidClassFeatures({ features, className, level, character, choicePrefix }) {
  return (features || [])
    .filter((feature) => featureIsAvailable(feature, level))
    .filter((feature) => featureMatchesClass(feature, className))
    .filter((feature) => !hasSubclassIdentity(feature))
    .filter((feature) => featurePassesChoiceGates(feature, character, choicePrefix));
}

function collectValidSubclassFeatures({ features, className, subclassName, level, character, choicePrefix }) {
  if (!subclassName) return [];
  return (features || [])
    .filter((feature) => featureIsAvailable(feature, level))
    .filter((feature) => featureMatchesClass(feature, className))
    .filter((feature) => featureMatchesSubclass(feature, subclassName))
    .filter((feature) => featurePassesChoiceGates(feature, character, choicePrefix));
}

const getPrimaryClassLevel = primaryClassLevel;

function featureIsAvailable(feature, level) {
  if (!feature || feature.isReprinted) return false;
  const featureLevel = Number(feature?.level || 1);
  return featureLevel <= Number(level || 1);
}

function featureMatchesClass(feature, className) {
  const target = norm(className);
  if (!target) return true;

  const explicit = feature?.className || feature?.class?.name || feature?.class;
  if (explicit) return norm(explicit) === target;

  const ref = feature?.classFeature || feature?.subclassFeature;
  const parsedClass = parseFeatureRefClass(ref);
  if (parsedClass) return norm(parsedClass) === target;

  // If the feature has no class metadata, assume the caller already supplied
  // the class-specific list (common for saved snapshots).
  return true;
}

function hasSubclassIdentity(feature) {
  return Boolean(
    feature?.subclassShortName
    || feature?.subclassName
    || feature?.subclass?.shortName
    || feature?.subclass?.name
    || feature?.subclassFeature
  );
}

function featureMatchesSubclass(feature, subclassName) {
  const target = norm(subclassName);
  if (!target) return false;

  const explicit = feature?.subclassShortName
    || feature?.subclassName
    || feature?.subclass?.shortName
    || feature?.subclass?.name;
  if (explicit) return norm(explicit) === target;

  const parsedSubclass = parseFeatureRefSubclass(feature?.subclassFeature);
  if (parsedSubclass) return norm(parsedSubclass) === target;

  // If this list is already pre-filtered and lacks subclass metadata, keep it.
  return true;
}

function parseFeatureRefClass(ref) {
  if (!ref || typeof ref !== 'string') return '';
  const parts = ref.split('|').map((part) => part.trim()).filter(Boolean);
  // 5etools refs usually look like: Name|Class|Source|Level
  return parts.length >= 2 ? parts[1] : '';
}

function parseFeatureRefSubclass(ref) {
  if (!ref || typeof ref !== 'string') return '';
  const parts = ref.split('|').map((part) => part.trim()).filter(Boolean);
  // Subclass refs usually include: Name|Class|ClassSource|Subclass|SubclassSource|Level
  return parts.length >= 4 ? parts[3] : '';
}

function featurePassesChoiceGates(feature, character, choicePrefix = '') {
  const gates = [
    ...asArray(feature?.requiredChoice),
    ...asArray(feature?.requiredChoices),
    ...asArray(feature?.choiceRequirement),
    ...asArray(feature?.choiceRequirements),
  ];
  if (!gates.length) return true;
  return gates.every((gate) => choiceGatePasses(gate, character, choicePrefix));
}

function choiceGatePasses(gate, character, choicePrefix = '') {
  if (!gate) return true;
  if (typeof gate === 'function') {
    try { return !!gate(character); } catch { return false; }
  }
  if (typeof gate === 'string') return hasChoiceValue(character, gate, null, choicePrefix);
  const key = gate.key || gate.choiceKey || gate.id;
  if (!key) return true;
  const expected = gate.value ?? gate.values ?? gate.option ?? gate.options ?? null;
  return hasChoiceValue(character, key, expected, choicePrefix);
}

function hasChoiceValue(character, key, expected, choicePrefix = '') {
  const choices = character?.choices || {};
  const direct = choices[key];
  const prefixed = choices[`${choicePrefix}${key}`];
  const stored = prefixed != null ? prefixed : direct;
  if (stored == null || stored === '') return false;
  if (expected == null) return true;

  const storedValues = asArray(stored).map(cleanChoiceText).map(norm).filter(Boolean);
  const expectedValues = asArray(expected).map(cleanChoiceText).map(norm).filter(Boolean);
  if (!expectedValues.length) return true;
  return expectedValues.some((value) => storedValues.includes(value));
}

function dedupeFeatures(features) {
  const seen = new Set();
  const out = [];
  (features || []).forEach((feature) => {
    const key = `${norm(feature?.name)}|${Number(feature?.level || 0)}|${norm(feature?.source)}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(feature);
  });
  return out.sort((a, b) => Number(a?.level || 0) - Number(b?.level || 0));
}

function FeatureSection({ title, color, features }) {
  if (!features?.length) return null;

  const groups = {};
  features.forEach((feature) => {
    const lv = feature.level == null ? 0 : Number(feature.level || 1);
    if (!groups[lv]) groups[lv] = [];
    groups[lv].push(feature);
  });

  return (
    <Box sx={{ mb: 1 }}>
      <Typography sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color, borderBottom: 1, borderColor: 'rgba(77,149,214,0.14)', pb: 0.25, mb: 0.4 }}>
        {title}
      </Typography>
      {Object.entries(groups).sort(([a], [b]) => Number(a) - Number(b)).map(([lv, feats]) => (
        <Box key={`${title}-${lv}`} sx={{ mb: 0.75 }}>
          <Typography sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#edd48a', borderBottom: 1, borderColor: 'rgba(237,212,138,0.2)', pb: 0.25, mb: 0.35 }}>
            {Number(lv) === 0 ? 'General' : `Level ${lv}`}
          </Typography>
          {feats.map((feature, index) => (
            <FeatureItem key={`${featureKey(feature)}-${index}`} feature={feature} tone={color} />
          ))}
        </Box>
      ))}
    </Box>
  );
}

function FeatureItem({ feature, tone }) {
  const [open, setOpen] = useState(false);
  const sourceKind = feature?.sourceKind || 'class';
  const isSubclass = sourceKind === 'subclass';
  const subclassTone = SOURCE_COLOR.subclass;
  const borderTone = isSubclass ? subclassTone : (tone || '#4d95d6');

  return (
    <Box
      className={open ? 'open' : ''}
      sx={{
        bgcolor: 'rgba(35,32,26,1)',
        border: 1,
        borderColor: 'divider',
        borderLeft: `3px solid ${borderTone}`,
        borderRadius: 1,
        mb: 0.25,
        overflow: 'hidden',
      }}
    >
      <Box onClick={() => setOpen(!open)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: '9px',
          py: '6px',
          cursor: 'pointer',
          '&:hover': { bgcolor: 'rgba(46,42,34,1)' },
        }}>
        <Typography sx={{ fontSize: '0.8125rem', color: 'text.primary', fontWeight: 600 }}>{feature.name}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {feature.source && <Typography sx={{ fontSize: '0.56rem', color: isSubclass ? subclassTone : 'text.secondary', fontStyle: 'italic' }}>{feature.source}</Typography>}
          {feature.level && <Chip size="small" label={`Lv ${feature.level}`} variant="outlined" sx={{ fontSize: '0.44rem', height: 16, color: 'text.secondary' }} />}
        </Box>
      </Box>
      <CollapsibleBody open={open}>
        {feature.entries ? (
          <Box sx={{ px: '12px', py: '8px', borderTop: 1, borderColor: 'divider' }}>
            <EntryBlocks entries={feature.entries} emptyText="" />
          </Box>
        ) : null}
      </CollapsibleBody>
    </Box>
  );
}

function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function featureKey(feature) {
  return `${norm(feature?.name)}|${Number(feature?.level || 0)}|${norm(feature?.source)}`;
}

function norm(value) {
  return cleanChoiceText(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function cleanChoiceText(text) {
  return String(text || '')
    .replace(/\{@[a-z]+ ([^|}]+)(?:\|[^}]*)?\}/gi, '$1')
    .split('|')[0]
    .replace(/_/g, ' ')
    .trim();
}


