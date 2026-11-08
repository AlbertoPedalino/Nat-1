import ChoiceBlock from './ChoiceBlock.jsx';
import { FeatCategorySlot, FeatFixedSlot } from './FeatSlots.jsx';
import ReplicateMagicItemChoice from './ReplicateMagicItemChoice.jsx';
import BeastChoice from './BeastChoice.jsx';
import SpellChoiceList from '../spells/SpellChoiceList.jsx';

// One builder choice, drawn by the component its spec type asks for. Every
// step (class, species, background) and a feat's own grants render their
// specs through here, so a spec type works wherever it is produced.
// `getOptionDescription` (value -> entries) is the class step's lookup for
// optional features; elsewhere the choice block finds none.
export default function ChoiceSpec({
  spec, state, dispatch, getOptionDescription,
}) {
  const { character, data } = state;
  switch (spec.type) {
    case 'spell_choice':
    case 'spell_grant':
      return <SpellChoiceList spec={spec} state={state} dispatch={dispatch} />;
    case 'feat_cat':
      return <FeatCategorySlot spec={spec} feats={data.feats} character={character} state={state} dispatch={dispatch} />;
    case 'feat_fixed':
      return <FeatFixedSlot spec={spec} feats={data.feats} character={character} state={state} dispatch={dispatch} />;
    case 'replicate_magic_item':
      return <ReplicateMagicItemChoice spec={spec} character={character} dispatch={dispatch} items={data.items} />;
    case 'beast_choice':
      return <BeastChoice spec={spec} character={character} dispatch={dispatch} beasts={data.beasts} />;
    default:
      return (
        <ChoiceBlock
          spec={spec}
          choices={character.choices}
          dispatch={dispatch}
          character={character}
          items={data.items}
          getOptionDescription={getOptionDescription}
        />
      );
  }
}
