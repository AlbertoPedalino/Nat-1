import { useMemo } from 'react';
import { Stack, Typography } from '@mui/material';
import { Layers } from 'lucide-react';
import BuilderPanel from '../components/BuilderPanel.jsx';
import ChoiceBlock from '../components/ChoiceBlock.jsx';
import { FeatCategorySlot, FeatFixedSlot } from '../components/FeatSlots.jsx';
import SpellChoiceList from '../components/SpellChoiceList.jsx';
import ReplicateMagicItemChoice from '../components/ReplicateMagicItemChoice.jsx';
import { classChoiceSpecs } from '../logic/choiceSpecs.js';
import { buildOptionalFeatureEntryLookup } from '../../../shared/character/optionalFeatures.js';
import NamePanel from '../components/NamePanel.jsx';
import XpPanel from '../components/XpPanel.jsx';
import ClassPanel from '../components/ClassPanel.jsx';
import LevelPanel from '../components/LevelPanel.jsx';
import SubclassPanel from '../components/SubclassPanel.jsx';
import SpellSlotsPanel from '../components/SpellSlotsPanel.jsx';
import SpellSelectionPanel from '../components/SpellSelectionPanel.jsx';

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
    if (spec.key.replace(/^mc\d+_/, '') === 'artificer_replicate_magic_item_plans') {
      return <ReplicateMagicItemChoice key={spec.key} spec={spec} character={character} dispatch={dispatch} items={state.data.items} />;
    }
    return <ChoiceBlock key={spec.key} spec={spec} choices={character.choices} dispatch={dispatch} character={character} getOptionDescription={makeOptionDescription(spec)} />;
  };

  return (
    <Stack spacing={2}>
      <NamePanel character={character} dispatch={dispatch} />
      <XpPanel character={character} dispatch={dispatch} />
      <ClassPanel state={state} character={character} dispatch={dispatch} />
      <LevelPanel character={character} dispatch={dispatch} />
      <SubclassPanel character={character} dispatch={dispatch} />
      <SpellSlotsPanel character={character} />
      <BuilderPanel id="panel-class-choices" title="Class Choices" icon={Layers} note="Class, subclass, ASI, expertise, optional, plus feat slots (Fighting Style, Epic Boon, ASI feat).">
        <Stack spacing={1.5}>
          {choiceSpecs.map(renderSpec)}
          {!choiceSpecs.length ? (
            <Typography color="text.secondary">No class choices at current level.</Typography>
          ) : null}
        </Stack>
      </BuilderPanel>
      <SpellSelectionPanel state={state} dispatch={dispatch} />
    </Stack>
  );
}
