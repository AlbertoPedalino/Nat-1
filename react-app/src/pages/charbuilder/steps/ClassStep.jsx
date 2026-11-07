import { useMemo } from 'react';
import { Stack, Typography } from '@mui/material';
import { Layers } from 'lucide-react';
import BuilderPanel from '../layout/BuilderPanel.jsx';
import ChoiceBlock from '../choices/ChoiceBlock.jsx';
import { FeatCategorySlot, FeatFixedSlot } from '../choices/FeatSlots.jsx';
import SpellChoiceList from '../spells/SpellChoiceList.jsx';
import ReplicateMagicItemChoice from '../choices/ReplicateMagicItemChoice.jsx';
import BeastChoice from '../choices/BeastChoice.jsx';
import { classChoiceSpecs } from '../choices/choiceSpecs.js';
import { buildOptionalFeatureEntryLookup } from '../../../shared/character/progression/optionalFeatures.js';
import NamePanel from '../layout/NamePanel.jsx';
import XpPanel from '../progression/XpPanel.jsx';
import ClassPanel from '../progression/ClassPanel.jsx';
import LevelPanel from '../progression/LevelPanel.jsx';
import SubclassPanel from '../progression/SubclassPanel.jsx';
import SpellSlotsPanel from '../spells/SpellSlotsPanel.jsx';
import SpellSelectionPanel from '../spells/SpellSelectionPanel.jsx';
import { baseChoiceKey } from '../../../shared/character/progression/choiceUtils.js';

export default function ClassStep({ state, dispatch }) {
  const { character } = state;
  const activeTab = character.activeClassTab || 0;
  const activeExtra = activeTab > 0 ? character.extraClasses?.[activeTab - 1] : null;

  const choiceSpecs = useMemo(
    () => classChoiceSpecs(character, { items: state.data.items }),
    [character, state.data.items, activeTab, activeExtra?.cls, state.adaptersVersion],
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

  const renderSpec = (spec) => {
    if (spec.type === 'spell_choice' || spec.type === 'spell_grant') {
      return <SpellChoiceList key={spec.key} spec={spec} state={state} dispatch={dispatch} />;
    }
    if (spec.type === 'feat_cat') {
      return <FeatCategorySlot key={spec.key} spec={spec} feats={state.data.feats} character={character} state={state} dispatch={dispatch} />;
    }
    if (spec.type === 'feat_fixed') {
      return <FeatFixedSlot key={spec.key} spec={spec} feats={state.data.feats} character={character} state={state} dispatch={dispatch} />;
    }
    if (spec.type === 'replicate_magic_item' || baseChoiceKey(spec.key) === 'artificer_replicate_magic_item_plans') {
      return <ReplicateMagicItemChoice key={spec.key} spec={spec} character={character} dispatch={dispatch} items={state.data.items} />;
    }
    if (spec.type === 'beast_choice') {
      return <BeastChoice key={spec.key} spec={spec} character={character} dispatch={dispatch} beasts={state.data.beasts} />;
    }
    return (
      <ChoiceBlock
        key={spec.key}
        spec={spec}
        choices={character.choices}
        dispatch={dispatch}
        character={character}
        items={state.data.items}
        getOptionDescription={makeOptionDescription(spec)}
      />
    );
  };

  return (
    <Stack spacing={2}>
      <NamePanel character={character} dispatch={dispatch} />
      <XpPanel character={character} dispatch={dispatch} />
      <ClassPanel state={state} character={character} dispatch={dispatch} />
      <LevelPanel character={character} dispatch={dispatch} />
      <SubclassPanel character={character} dispatch={dispatch} />
      <BuilderPanel id="panel-class-choices" title="Class Choices" icon={Layers} note="Class, subclass, ASI, expertise, optional, plus feat slots (Fighting Style, Epic Boon, ASI feat).">
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
