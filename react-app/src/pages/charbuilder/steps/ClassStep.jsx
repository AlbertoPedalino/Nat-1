import { useMemo } from 'react';
import { Stack, Typography } from '@mui/material';
import { Layers } from 'lucide-react';
import BuilderPanel from '../layout/BuilderPanel.jsx';
import ChoiceSpec from '../choices/ChoiceSpec.jsx';
import { classChoiceSpecs } from '../choices/choiceSpecs.js';
import { buildOptionalFeatureEntryLookup } from '../../../shared/character/progression/optionalFeatures.js';
import NamePanel from '../layout/NamePanel.jsx';
import XpPanel from '../progression/XpPanel.jsx';
import ClassPanel from '../progression/ClassPanel.jsx';
import BooksPanel from '../progression/BooksPanel.jsx';
import LevelPanel from '../progression/LevelPanel.jsx';
import SubclassPanel from '../progression/SubclassPanel.jsx';
import SpellSlotsPanel from '../spells/SpellSlotsPanel.jsx';
import SpellSelectionPanel from '../spells/SpellSelectionPanel.jsx';
import { activeExtraClass } from '../state/activeClass.js';
import { ENTITY_COLORS } from '../../../shared/ui/entityColors.js';

export default function ClassStep({ state, dispatch }) {
  const { character } = state;
  const activeTab = character.activeClassTab || 0;
  const activeExtra = activeExtraClass(character);

  const choiceSpecs = useMemo(
    () => classChoiceSpecs(character, { items: state.data.items, optionalFeatures: state.data.optionalFeatures }),
    [character, state.data.items, state.data.optionalFeatures, activeTab, activeExtra?.cls, state.adaptersVersion],
  );

  // Live 2024 optional-feature descriptions (XPHB/XDMG/EFA/FRAiF/FRHoF). Lookups are
  // memoized per featureType so a spec resolves only its own kind (e.g. Eldritch
  // Invocations → 'EI'); featureType null matches by name across all types.
  const optionalFeatureLookups = useMemo(() => new Map(), [state.data.optionalFeatures]);
  const getOptionalFeatureLookup = (featureType) => {
    const cacheKey = featureType ? String(featureType).toLowerCase() : '*';
    if (!optionalFeatureLookups.has(cacheKey)) {
      optionalFeatureLookups.set(cacheKey, buildOptionalFeatureEntryLookup(state.data.optionalFeatures, featureType));
    }
    return optionalFeatureLookups.get(cacheKey);
  };

  // Returns a per-option description resolver for choice lists that opt in via
  // `descSource: 'optionalFeature'` (live entries, optionally scoped by `featureType`)
  // and/or carry a curated `descMap` fallback. Other specs → none.
  const makeOptionDescription = (spec) => {
    const wantsLive = spec?.descSource === 'optionalFeature';
    const descMap = spec?.descMap || null;
    if (!wantsLive && !descMap) return undefined;
    const lookup = wantsLive ? getOptionalFeatureLookup(spec?.featureType || null) : null;
    return (value) => (lookup ? lookup(value) : null) || (descMap ? descMap[value] : null) || null;
  };

  const renderSpec = (spec) => (
    <ChoiceSpec key={spec.key} spec={spec} state={state} dispatch={dispatch} getOptionDescription={makeOptionDescription(spec)} />
  );


  return (
    <Stack spacing={2}>
      <NamePanel character={character} dispatch={dispatch} />
      <XpPanel character={character} dispatch={dispatch} />
      <BooksPanel character={character} dispatch={dispatch} />
      <ClassPanel state={state} character={character} dispatch={dispatch} />
      <LevelPanel character={character} dispatch={dispatch} />
      <SubclassPanel character={character} dispatch={dispatch} />
      <BuilderPanel id="panel-class-choices" tone={ENTITY_COLORS.class} title="Class Choices" icon={Layers} note="Class, subclass, ASI, expertise, optional, plus feat slots (Fighting Style, Epic Boon, ASI feat).">
        <Stack spacing={1.5}>
          {choiceSpecs.map(renderSpec)}
          {!choiceSpecs.length ? (
            <Typography sx={{ color: 'text.secondary' }}>No class choices at current level.</Typography>
          ) : null}
        </Stack>
      </BuilderPanel>
      <SpellSlotsPanel character={character} />
      <SpellSelectionPanel state={state} dispatch={dispatch} />
    </Stack>
  );
}
