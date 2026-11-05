import ActionDetailPanel from './ActionDetailPanel.jsx';
import CreatedItemsPanel from '../inventory/CreatedItemsPanel.jsx';
import MagicItemTinkerPanel from '../inventory/MagicItemTinkerPanel.jsx';
import WildShapePanel from '../forms/WildShapePanel.jsx';
import WildCompanionPanel from '../forms/WildCompanionPanel.jsx';
import EldritchCannonPanel from '../forms/EldritchCannonPanel.jsx';
import SummonedCreaturePanel from '../forms/SummonedCreaturePanel.jsx';
import PrimalCompanionPanel from '../forms/PrimalCompanionPanel.jsx';

// The panel an action card opens, by the `detailType` its adapter declares.
// A feature with its own interactive panel (a form, a creature, crafted items)
// adds one entry here; the Actions tab never checks for a class or feature.
export const ACTION_DETAIL_RENDERERS = {
  panel: ActionDetailPanel,
  createdItems: CreatedItemsPanel,
  wildShape: WildShapePanel,
  wildCompanion: WildCompanionPanel,
  eldritchCannon: EldritchCannonPanel,
  magicItemTinker: MagicItemTinkerPanel,
  summonedCreature: SummonedCreaturePanel,
  primalCompanion: PrimalCompanionPanel,
};
