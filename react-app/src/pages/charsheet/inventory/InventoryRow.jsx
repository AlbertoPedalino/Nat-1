import { memo } from 'react';
import { Box, Button, IconButton, Tooltip, Typography } from '@mui/material';
import { AlertTriangle, Archive, Check, Trash2 } from 'lucide-react';
import { ItemNameIcon } from '../../../shared/content/FiveEToolsLink.jsx';
import MiniBadge from '../../../shared/ui/MiniBadge.jsx';
import { ExpandableCard } from '../../../shared/ui/ExpandableCard.jsx';
import { ENTITY_COLORS, ITEM_ATTUNEMENT } from '../../../shared/ui/entityColors.js';
import { ItemReferenceBody } from '../../../shared/character/inventory/ItemReference.jsx';
import {
  attunementRequirementText,
  getAttunementEligibility,
} from '../../../shared/character/inventory/itemAttunement.js';
import { buildItemTags } from '../../../shared/character/inventory/craftedItems.js';
import {
  itemChargeCurrent,
  itemChargeMaximum,
  shouldShowItemCharges,
} from '../../../shared/character/inventory/itemCharges.js';
import { hasItemFlag, itemFlagFitsItem } from '../../../shared/character/inventory/itemFlags.js';
import { itemCardName } from '../../../shared/character/inventory/replicateMagicItem.js';
import { scrollCardName } from '../../../shared/character/inventory/spellScrolls.js';
import { rarityTone } from '../../../shared/character/inventory/itemRarity.js';
import ToneBar from '../../../shared/ui/ToneBar.jsx';
import { isItemCarried, itemQty } from '../../../shared/character/inventory/weight.js';
import { canOneHand, canTwoHand, isThrownWeapon } from './equipmentSlots.js';
import { THROWN_SLOT } from '../../../shared/character/inventory/itemContainers.js';
import ItemExtras from './ItemExtras.jsx';
import { UI_COLORS, OPACITY } from '../../../shared/ui/colors.js';
import { tintedSurfaceSx } from '../../../shared/ui/surfaces.js';
import { FONT_SIZES, LINE_HEIGHTS } from '../../../shared/ui/fonts.js';
import CountStepper from '../../../shared/ui/CountStepper.jsx';
import { pressableSx, stepButtonSx, toggleSx } from '../../../shared/ui/pressable.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import { CONTROL_HEIGHTS } from '../../../shared/ui/controlHeights.js';
import { CARD_PART_RULE_SX, CARD_SX } from '../../../shared/ui/interactive.js';
import { isEquippable, isWeaponItem } from '../../../shared/character/inventory/itemKinds.js';
import TipIconButton from '../../../shared/ui/TipIconButton.jsx';

// The size and lettering of the row's small controls and tags; a control's
// look is toggleSx (raised, filled while on), a tag's the flat tint.
const itemStateChipBaseSx = {
  minWidth: 0,
  px: 1,
  py: 0.25,
  borderRadius: 0.375,
  ...TEXT_STYLES.title,
  fontSize: FONT_SIZES.xxs,
  lineHeight: LINE_HEIGHTS.relaxed,
};

// Provenance tags ([custom] + crafted badges) on their own row beneath the item
// name so a long name truncates cleanly instead of being shoved by trailing tags
// (notably on mobile). `[custom]` stays plain text — it's a flag, not a tone pill.
function ItemTagsRow({ item, character }) {
  const tags = buildItemTags(item, character);
  if (!item.custom && tags.length === 0) return null;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
      {item.custom ? <Box component="span" sx={{ fontSize: FONT_SIZES.xxs, color: 'text.secondary' }}>[custom]</Box> : null}
      {tags.map((tag) => <MiniBadge key={tag.key} label={tag.label} color={tag.color} />)}
    </Box>
  );
}

// One inventory entry: name, tags and warnings, then its controls (slots or
// Equip, class item flags, attunement, charges, carry, quantity, remove). The
// expanded part is the item's reference text and its extras.
// `actions` and `attunement` are memoized by InventoryTab so the row stays memo.
const InventoryRow = memo(function InventoryRow({ item, index, character, penaltyMsg, itemFlagDefs, attunement, actions }) {
  const canEquip = isEquippable(item);
  const carried = isItemCarried(item);
  const chargeMaximum = itemChargeMaximum(item);
  const chargeCurrent = itemChargeCurrent(item);

  // Everything about an item wears the items' bordeaux (ITEM_ATTUNEMENT):
  // equipped, its slot, attuned.
  const rowBorderColor = penaltyMsg ? 'warning.main' : (item.equipped ? ITEM_ATTUNEMENT : (!carried ? UI_COLORS.outline : UI_COLORS.edge));
  // A magic item's card is washed in its rarity's colour; equipped still
  // shows on its edge.
  const rarity = rarityTone(item);

  return (
    <ExpandableCard
      containerSx={{ ...CARD_SX, mb: 0.5, overflow: 'hidden', borderColor: rowBorderColor }}
      detailsSx={{ fontSize: FONT_SIZES.md, color: 'text.secondary', lineHeight: LINE_HEIGHTS.normal, bgcolor: UI_COLORS.surfaceSunken, ...CARD_PART_RULE_SX, px: 1.25, py: 0.75 }}
      details={(
        <>
          <ItemReferenceBody item={item} />
          <ItemExtras
            item={item}
            character={character}
            onWriteScroll={(patch) => actions.writeScroll(index, patch)}
            onConsumeTome={() => actions.consumeTome(index)}
            onPickAbility={(groupIdx, abilities) => actions.abilityChoice(index, groupIdx, abilities)}
          />
        </>
      )}
      summary={({ toggle, open }) => (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, px: 1.25, py: 0.75, ...(rarity ? tintedSurfaceSx(rarity, { amount: OPACITY.tint, base: UI_COLORS.surfaceHeader }) : item.equipped ? tintedSurfaceSx(ITEM_ATTUNEMENT, { amount: OPACITY.tint, base: UI_COLORS.surfaceHeader }) : (!carried ? tintedSurfaceSx(UI_COLORS.surfaceHeader, { amount: OPACITY.strong }) : { bgcolor: UI_COLORS.surfaceHeader })), opacity: carried ? 1 : OPACITY.veil }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box onClick={toggle} sx={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
              {/* A magic item's rarity, marked as an action's category is. */}
              <ToneBar tone={rarity} />
              <ItemNameIcon item={item} />
              <Typography noWrap sx={{ fontSize: FONT_SIZES.xxl, color: rarity || 'text.primary', minWidth: 0 }}>{scrollCardName(item, itemCardName(item))}</Typography>
            </Box>
            <ItemTagsRow item={item} character={character} />
            {!carried ? (
              <Typography sx={{ fontSize: FONT_SIZES.xxs, color: UI_COLORS.textMuted, mt: 0.25, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Archive size={ICON_SIZES.xxs} /> Owned, not carried
              </Typography>
            ) : null}
            {penaltyMsg && (
              <Typography sx={{ fontSize: FONT_SIZES.xs, color: 'warning.main', mt: 0.25, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AlertTriangle size={ICON_SIZES.xxs} /> {penaltyMsg}
              </Typography>
            )}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 0.75, flexWrap: 'wrap' }}>
          {carried && isWeaponItem(item) ? (
            <Box sx={{ display: 'flex', gap: 0.25 }}>
              {canOneHand(item) ? (
                <SlotBtn active={item.equippedSlot === 'mainHand'} onClick={() => actions.equipSlot(index, 'mainHand')} label="MH" />
              ) : null}
              {canOneHand(item) ? (
                <SlotBtn active={item.equippedSlot === 'offHand'} onClick={() => actions.equipSlot(index, 'offHand')} label="OH" />
              ) : null}
              {canTwoHand(item) ? (
                <SlotBtn active={item.equippedSlot === 'twoHands'} onClick={() => actions.equipSlot(index, 'twoHands')} label="2H" />
              ) : null}
              {isThrownWeapon(item) ? (
                <SlotBtn active={item.equippedSlot === THROWN_SLOT} onClick={() => actions.equipSlot(index, THROWN_SLOT)} label="Thrown" />
              ) : null}
            </Box>
          ) : carried && canEquip ? (
            <Button size="small" onClick={() => actions.equip(index)} startIcon={item.equipped ? <Check size={ICON_SIZES.xxs} /> : null}
              sx={{ ...itemStateChipBaseSx, ...toggleSx(item.equipped, ITEM_ATTUNEMENT) }}>
              {item.equipped ? 'Equip.' : 'Equip'}
            </Button>
          ) : null}
          {carried ? itemFlagDefs.filter((def) => itemFlagFitsItem(def, item)).map((def) => (
            <ItemFlagButton key={def.key} def={def} active={hasItemFlag(item, def.key)} onClick={() => actions.toggleFlag(index, def)} />
          )) : null}
          {carried && item.reqAttune ? (
            <AttuneButton item={item} index={index} attunement={attunement} character={character} onAttune={actions.attune} />
          ) : null}
          {shouldShowItemCharges(item) ? (
            <Box
              aria-label={`${item.name} charges`}
              sx={{
                ...itemStateChipBaseSx,
                border: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                borderColor: ITEM_ATTUNEMENT,
                color: ITEM_ATTUNEMENT,
                // Washed over the summary's header tone, so the chip stays solid.
                ...tintedSurfaceSx(ITEM_ATTUNEMENT, { amount: OPACITY.fill, base: UI_COLORS.surfaceHeader }),
              }}
            >
              <Box component="span">
                Charges
              </Box>
              <CountStepper
                value={`${chargeCurrent}/${chargeMaximum}`}
                size={16}
                tone={ITEM_ATTUNEMENT}
                label={`${item.name} charges`}
                canDecrease={chargeCurrent > 0}
                canIncrease={chargeCurrent < chargeMaximum}
                onStep={(delta) => actions.charges(index, delta)}
              />
            </Box>
          ) : null}
          {/* Where the item is and how many, apart from how it is being used. */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0, ml: 'auto' }}>
            <Button size="small" onClick={() => actions.carried(index)} startIcon={!carried ? <Archive size={ICON_SIZES.xxs} /> : null}
              sx={{ ...itemStateChipBaseSx, ...toggleSx(!carried, UI_COLORS.outline) }}>
              {carried ? 'Stash' : 'Carry'}
            </Button>
            <CountStepper value={itemQty(item)} label={`${item.name} quantity`} onStep={(delta) => actions.qty(index, delta)} />
            <TipIconButton title="Remove" size="small" ariaLabel={`Remove ${item.name}`} onClick={() => actions.remove(index)} sx={stepButtonSx(20, { danger: true })}>
              <Trash2 size={ICON_SIZES.xs} />
            </TipIconButton>
          </Box>
        </Box>
      </Box>
      )}
    />
  );
});

function ItemFlagButton({ def, active, onClick }) {
  const tone = def.tone || ENTITY_COLORS.class;
  return (
    <Button size="small" onClick={onClick} startIcon={active ? <Check size={ICON_SIZES.xxs} /> : null}
      sx={{ ...itemStateChipBaseSx, ...toggleSx(active, tone) }}>
      {active ? (def.activeLabel || def.label) : def.label}
    </Button>
  );
}

function SlotBtn({ active, onClick, label }) {
  return (
    <IconButton size="small" onClick={onClick}
      sx={{
        ...toggleSx(active, ITEM_ATTUNEMENT),
        minWidth: 24, height: CONTROL_HEIGHTS.md, px: 0.5,
        borderRadius: 0.375,
        ...TEXT_STYLES.title,
        fontSize: FONT_SIZES.xxxs,
      }}
    >
      {label}
    </IconButton>
  );
}

// Attune toggle for an item requiring attunement. Structured prerequisite
// failures block attunement; unmodeled alternatives remain advisory.
function AttuneButton({ item, index, attunement, character, onAttune }) {
  const { full: attunementFull, context: attunementContext, limit: attunementLimit } = attunement;
  const reqText = attunementRequirementText(item);
  const eligibility = getAttunementEligibility(item, character, attunementContext);
  const hasRequirementWarning = eligibility.status === 'ineligible' || eligibility.status === 'unknown';
  const blockedByLimit = !item.attuned && attunementFull;
  const blocked = blockedByLimit || (!item.attuned && eligibility.status === 'ineligible');
  const cursedAttuned = Boolean(item.attuned && item.curse);
  const tip = [
    reqText,
    blockedByLimit ? `Attunement limit reached (${attunementLimit})` : null,
    hasRequirementWarning ? eligibility.reason : null,
    cursedAttuned ? 'A cursed item cannot be unattuned voluntarily' : null,
  ].filter(Boolean).join(' · ');
  const accent = item.attuned ? ITEM_ATTUNEMENT : (hasRequirementWarning ? UI_COLORS.accent : null);
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Tooltip title={tip} arrow>
        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}>
          <Button size="small" disabled={blocked} onClick={() => onAttune?.(index)}
            startIcon={cursedAttuned ? <AlertTriangle size={ICON_SIZES.xxs} /> : (item.attuned ? <Check size={ICON_SIZES.xxs} /> : (hasRequirementWarning ? <AlertTriangle size={ICON_SIZES.xxs} /> : null))}
            sx={{ ...itemStateChipBaseSx, ...toggleSx(item.attuned, ITEM_ATTUNEMENT), ...(hasRequirementWarning && !item.attuned ? { color: UI_COLORS.accentText } : null), '&.Mui-disabled': { opacity: OPACITY.edge } }}>
            {cursedAttuned ? 'Cursed' : (item.attuned ? 'Attuned' : 'Attune')}
          </Button>
        </Box>
      </Tooltip>
      {cursedAttuned ? (
        <Tooltip title="Use Remove Curse or equivalent magic, then end attunement" arrow>
          <Button size="small" onClick={() => onAttune?.(index, { curseBroken: true })}
            sx={{ ...itemStateChipBaseSx, ...pressableSx(UI_COLORS.dangerDeep) }}>
            Break Curse & Unattune
          </Button>
        </Tooltip>
      ) : null}
    </Box>
  );
}

export default InventoryRow;
