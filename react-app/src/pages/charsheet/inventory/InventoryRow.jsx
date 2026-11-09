import { memo } from 'react';
import { cornerRadius } from '../../../shared/ui/radius.js';
import { Box, Button, IconButton, Tooltip, Typography, alpha } from '@mui/material';
import { AlertTriangle, Archive, Check, Minus, Plus, Trash2 } from 'lucide-react';
import { ItemNameIcon } from '../../../shared/content/FiveEToolsLink.jsx';
import MiniBadge from '../../../shared/ui/MiniBadge.jsx';
import { ExpandableCard } from '../../../shared/ui/ExpandableCard.jsx';
import { ENTITY_COLORS, ITEM_ATTUNEMENT, chipTintStyle } from '../../../shared/ui/entityColors.js';
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
import { isItemCarried, itemQty as qty } from '../../../shared/character/inventory/weight.js';
import { canOneHand, canTwoHand, isThrownWeapon, THROWN_SLOT } from './equipmentSlots.js';
import ItemExtras from './ItemExtras.jsx';
import { UI_COLORS, uiAlpha } from '../../../shared/ui/colors.js';
import { UI_FONTS, FONT_SIZES, LETTER_SPACINGS } from '../../../shared/ui/fonts.js';
import { isWeaponItem } from '../../../shared/character/inventory/itemCodes.js';
import CountStepper, { stepButtonSx } from '../../../shared/ui/CountStepper.jsx';

const itemStateChipBaseSx = {
  minWidth: 0,
  px: '7px',
  py: '2px',
  border: 1,
  borderRadius: 0.375,
  fontFamily: UI_FONTS.display,
  fontSize: FONT_SIZES.xxs,
  fontWeight: 700,
  lineHeight: 1.75,
  letterSpacing: 0,
  textTransform: 'none',
};

// Provenance tags ([custom] + crafted badges) on their own row beneath the item
// name so a long name truncates cleanly instead of being shoved by trailing tags
// (notably on mobile). `[custom]` stays plain text — it's a flag, not a tone pill.
function ItemTagsRow({ item, character }) {
  const tags = buildItemTags(item, character);
  if (!item.custom && tags.length === 0) return null;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', mt: '3px' }}>
      {item.custom ? <Box component="span" sx={{ fontSize: FONT_SIZES.xxs, color: 'text.secondary' }}>[custom]</Box> : null}
      {tags.map((tag) => <MiniBadge key={tag.key} label={tag.label} color={tag.color} bg={tag.bg} />)}
    </Box>
  );
}

// One inventory entry: name, tags and warnings, then its controls (slots or
// Equip, class item flags, attunement, charges, carry, quantity, remove). The
// expanded part is the item's reference text and its extras.
// `actions` and `attunement` are memoized by InventoryTab so the row stays memo.
const InventoryRow = memo(function InventoryRow({ item, index, character, penaltyMsg, itemFlagDefs, attunement, actions }) {
  const type = String(item.type || '').toUpperCase();
  const canEquip = ['M', 'R', 'LA', 'MA', 'HA', 'S', 'SCF', 'WD', 'RD', 'ST', 'WI', 'WEAPON', 'ARMOR'].includes(type);
  const carried = isItemCarried(item);
  const chargeMaximum = itemChargeMaximum(item);
  const chargeCurrent = itemChargeCurrent(item);

  const rowBorderColor = penaltyMsg ? 'warning.main' : (item.equipped ? UI_COLORS.secondaryStrong : (!carried ? UI_COLORS.outline : 'divider'));

  return (
    <ExpandableCard
      containerSx={{ mb: '4px', overflow: 'hidden' }}
      detailsSx={{ fontSize: FONT_SIZES.md, color: 'text.secondary', lineHeight: 1.45, bgcolor: UI_COLORS.surfaceSunken, border: 1, borderTop: 'none', borderColor: rowBorderColor, borderRadius: cornerRadius(0, 0, 1, 1), px: '10px', py: '6px', mt: 0, mb: 0 }}
      details={(
        <>
          <ItemReferenceBody item={item} />
          <ItemExtras
            item={item}
            onWriteScroll={(patch) => actions.writeScroll(index, patch)}
            onConsumeTome={() => actions.consumeTome(index)}
            onPickAbility={(groupIdx, abilities) => actions.abilityChoice(index, groupIdx, abilities)}
          />
        </>
      )}
      summary={({ toggle, open }) => (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px', px: '10px', py: '6px', bgcolor: item.equipped ? uiAlpha(UI_COLORS.secondaryStrong, 0.06) : (!carried ? uiAlpha(UI_COLORS.surfaceHeader, 0.55) : UI_COLORS.surfaceHeader), border: 1, borderColor: rowBorderColor, borderRadius: open ? '8px 8px 0 0' : 1, mb: 0, opacity: carried ? 1 : 0.82, '&:hover': { borderColor: uiAlpha(UI_COLORS.accent, 0.34) } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <Box onClick={toggle} sx={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '3px', minWidth: 0 }}>
              <ItemNameIcon item={item} />
              <Typography noWrap sx={{ fontSize: FONT_SIZES.xxl, color: 'text.primary', minWidth: 0 }}>{scrollCardName(item, itemCardName(item))}</Typography>
            </Box>
            <ItemTagsRow item={item} character={character} />
            {!carried ? (
              <Typography sx={{ fontSize: FONT_SIZES.xxs, color: UI_COLORS.textMuted, mt: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Archive size={10} /> Owned, not carried
              </Typography>
            ) : null}
            {penaltyMsg && (
              <Typography sx={{ fontSize: FONT_SIZES.xs, color: 'warning.main', mt: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertTriangle size={10} /> {penaltyMsg}
              </Typography>
            )}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '6px', flexWrap: 'wrap' }}>
          {carried && isWeaponItem(item) ? (
            <Box sx={{ display: 'flex', gap: '2px' }}>
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
            <Button size="small" onClick={() => actions.equip(index)} startIcon={item.equipped ? <Check size={11} /> : null}
              sx={{ minWidth: 0, px: '7px', py: '2px', border: 1, borderColor: item.equipped ? UI_COLORS.secondaryStrong : 'divider', borderRadius: 0.375, color: item.equipped ? UI_COLORS.secondaryStrong : 'text.secondary', bgcolor: item.equipped ? uiAlpha(UI_COLORS.secondaryStrong, 0.12) : 'transparent', fontFamily: UI_FONTS.display, fontSize: FONT_SIZES.xxs }}>
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
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                borderColor: ITEM_ATTUNEMENT,
                color: ITEM_ATTUNEMENT,
                bgcolor: alpha(ITEM_ATTUNEMENT, 0.14),
              }}
            >
              <Box component="span">
                Charges
              </Box>
              <ChargeStepButton ariaLabel={`Spend one ${item.name} charge`} disabled={chargeCurrent <= 0} onClick={() => actions.charges(index, -1)}>
                <Minus size={10} />
              </ChargeStepButton>
              <Box component="span" sx={{ minWidth: 28, textAlign: 'center' }}>
                {chargeCurrent}/{chargeMaximum}
              </Box>
              <ChargeStepButton ariaLabel={`Restore one ${item.name} charge`} disabled={chargeCurrent >= chargeMaximum} onClick={() => actions.charges(index, 1)}>
                <Plus size={10} />
              </ChargeStepButton>
            </Box>
          ) : null}
          {/* Where the item is and how many, apart from how it is being used. */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, ml: 'auto' }}>
            <Button size="small" onClick={() => actions.carried(index)} startIcon={!carried ? <Archive size={11} /> : null}
              sx={{ minWidth: 0, px: '7px', py: '2px', border: 1, borderColor: carried ? 'divider' : UI_COLORS.outline, borderRadius: 0.375, color: carried ? 'text.secondary' : UI_COLORS.textSecondary, bgcolor: carried ? 'transparent' : uiAlpha(UI_COLORS.outline, 0.14), fontFamily: UI_FONTS.display, fontSize: FONT_SIZES.xxs }}>
              {carried ? 'Stash' : 'Carry'}
            </Button>
            <CountStepper value={qty(item)} label={`${item.name} quantity`} onStep={(delta) => actions.qty(index, delta)} />
            <Tooltip title="Remove">
              <IconButton size="small" aria-label={`Remove ${item.name}`} onClick={() => actions.remove(index)} sx={stepButtonSx(20, { danger: true })}>
                <Trash2 size={12} />
              </IconButton>
            </Tooltip>
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
    <Button size="small" onClick={onClick} startIcon={active ? <Check size={11} /> : null}
      sx={{
        minWidth: 0, px: '7px', py: '2px', border: 1, borderRadius: 0.375, fontFamily: UI_FONTS.display, fontSize: FONT_SIZES.xxs,
        ...(active ? chipTintStyle(tone, { bgAlpha: 0.14, borderAlpha: 1 }) : { borderColor: 'divider', color: 'text.secondary', bgcolor: 'transparent' }),
      }}>
      {active ? (def.activeLabel || def.label) : def.label}
    </Button>
  );
}

function ChargeStepButton({ children, disabled = false, ariaLabel, onClick }) {
  return (
    <IconButton
      size="small"
      disabled={disabled}
      aria-label={ariaLabel}
      onClick={onClick}
      sx={{
        width: 16,
        height: 16,
        p: 0,
        color: 'inherit',
        borderRadius: 0.375,
        '&:hover': { color: 'inherit', bgcolor: alpha(ITEM_ATTUNEMENT, 0.16) },
        '&.Mui-disabled': { color: 'inherit', opacity: 0.35 },
      }}
    >
      {children}
    </IconButton>
  );
}

function SlotBtn({ active, onClick, label }) {
  return (
    <IconButton size="small" onClick={onClick}
      sx={{
        minWidth: 24, height: 24, px: '4px',
        border: 1,
        borderColor: active ? UI_COLORS.accent : 'divider',
        borderRadius: 0.375,
        color: active ? UI_COLORS.accentText : 'text.secondary',
        bgcolor: active ? uiAlpha(UI_COLORS.accent, 0.14) : 'transparent',
        fontFamily: UI_FONTS.display,
        fontSize: FONT_SIZES.xxxs,
        fontWeight: 700,
        letterSpacing: LETTER_SPACINGS.sm,
        '&:hover': { borderColor: UI_COLORS.accent, color: UI_COLORS.accent },
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
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <Tooltip title={tip} arrow>
        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}>
          <Button size="small" disabled={blocked} onClick={() => onAttune?.(index)}
            startIcon={cursedAttuned ? <AlertTriangle size={11} /> : (item.attuned ? <Check size={11} /> : (hasRequirementWarning ? <AlertTriangle size={11} /> : null))}
            sx={{ ...itemStateChipBaseSx, borderColor: accent || 'divider', color: accent || 'text.secondary', bgcolor: item.attuned ? alpha(ITEM_ATTUNEMENT, 0.14) : 'transparent', '&.Mui-disabled': { opacity: 0.4 } }}>
            {cursedAttuned ? 'Cursed' : (item.attuned ? 'Attuned' : 'Attune')}
          </Button>
        </Box>
      </Tooltip>
      {cursedAttuned ? (
        <Tooltip title="Use Remove Curse or equivalent magic, then end attunement" arrow>
          <Button size="small" onClick={() => onAttune?.(index, { curseBroken: true })}
            sx={{ minWidth: 0, px: '7px', py: '2px', border: 1, borderColor: UI_COLORS.dangerDeep, borderRadius: 0.375, color: UI_COLORS.dangerMuted, fontFamily: UI_FONTS.display, fontSize: FONT_SIZES.xxs }}>
            Break Curse & Unattune
          </Button>
        </Tooltip>
      ) : null}
    </Box>
  );
}

export default InventoryRow;
