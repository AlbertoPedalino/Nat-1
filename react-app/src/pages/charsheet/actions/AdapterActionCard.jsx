import { Box, Button, Chip, Typography } from '@mui/material';
import { describeAttackRoll } from '../../../shared/character/combat/conditions.js';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import { readChoiceValue } from '../../../shared/character/progression/choiceUtils.js';
import { asArray } from '../../../shared/lists.js';
import { toggleActiveField } from '../state/toggleState.js';
import { CAT_COLORS } from './actionTags.js';
import { getActionRollers } from '../../../shared/character/dice/rollers.js';
import { WeaponMasteryBlock } from '../../../shared/character/combat/WeaponMasteryBlock.jsx';
import { WeaponNoteBlock } from '../../../shared/character/combat/WeaponNoteBlock.jsx';
import { inlineButtonSx, spellBodySx, spellCardSx, spellRowSx } from '../spells/spellsTabStyles.js';
import { CARD_PART_RULE_SX } from '../../../shared/ui/interactive.js';
import { ACTION_DETAIL_RENDERERS } from './actionDetailRenderers.js';
import AttackRollButton from './AttackRollButton.jsx';
import { useSheetActions } from '../state/SheetActionsContext.jsx';
import ResourceBar from '../resources/ResourceBar.jsx';
import { RichInline, RichText } from '../../../shared/content/RichText.jsx';
import { EntryBlocks } from '../../../shared/content/EntryBlocks.jsx';
import { ExpandableCard } from '../../../shared/ui/ExpandableCard.jsx';
import CollapsibleNote from '../../../shared/ui/CollapsibleNote.jsx';
import PipButton from '../../../shared/ui/PipButton.jsx';
import MiniBadge from '../../../shared/ui/MiniBadge.jsx';
import { ItemPropertyTable } from '../../../shared/character/inventory/ItemPropertyTable.jsx';
import { formatRollTitle } from '../../../shared/character/dice/dice.js';
import RollerButtons from '../../../shared/character/dice/RollerButtons.jsx';
import { CHIP_TONES, chipToneStyle } from '../../../shared/ui/entityColors.js';
import { UI_COLORS, uiAlpha, OPACITY } from '../../../shared/ui/colors.js';
import { FONT_SIZES, FONT_WEIGHTS } from '../../../shared/ui/fonts.js';
import { cardTitleSx, inlineMetaLabelSx } from '../../../shared/ui/PanelHeader.jsx';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { getCritRange } from '../../../shared/character/sheet/effectBonuses.js';

// An adapter-defined action on the Actions tab: uses, rollers, resource
// pips and any choice it asks for.

export function AdapterActionCard({ C, sheet, action, resources, onResChange, onRoll, onShowToast, onNotice, resMax, isPool, resTrack, colorBarCat, displayName }) {
  const barCat = colorBarCat || action._colorBarCat || action.cat;
  const { onUpdateCharacter } = useSheetActions();
  const DetailRenderer = action.detailType ? ACTION_DETAIL_RENDERERS[action.detailType] : null;
  const hasRes = action.resKey && resources && resources[action.resKey] != null;
  const resCur = hasRes ? (resources[action.resKey] ?? 0) : 0;
  const safeMax = resMax === Infinity ? Infinity : Math.max(0, Number(resMax ?? 1) || 1);
  const hasEntries = Array.isArray(action.entries) ? action.entries.length > 0 : Boolean(action.entries);
  const hasDescription = Boolean(String(action.desc || '').trim());
  // Interactive card = its expanded body carries its own controls (a DetailRenderer
  // panel or an inline choice picker); its description is tucked into a collapsible
  // disclosure so the controls stay the focus. Plain cards show the description inline.
  const cardInteractive = Boolean(DetailRenderer) || Boolean(action.choiceKey && onUpdateCharacter);
  const descriptionNode = (hasEntries || hasDescription)
    ? (hasEntries ? <EntryBlocks entries={action.entries} emptyText="" /> : <RichText text={action.desc} />)
    : null;
  const hasActionDetails = Boolean(
    action._item
    || hasEntries
    || hasDescription
    || (action.choiceKey && onUpdateCharacter)
    || action._weaponMastery
    || action._weaponNotes?.length
    || DetailRenderer
  );
  const hasStatusRow = Boolean(action._toggleKey && onUpdateCharacter);
  const hasPersistentRows = hasStatusRow || hasRes;
  const persistentRowSx = (bgcolor, isLast, open) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 0.5,
    px: 1.25,
    py: 0.75,
    ...CARD_PART_RULE_SX,
    bgcolor,
  });

  const rollers = getActionRollers(action);
  const hasRollers = Number.isFinite(action.attackBonus) || rollers.length > 0;

  // Attack-roll advantage/disadvantage from active conditions, combined with
  // the weapon-level disadvantage (heavy/untrained).
  const activeConditions = sheet?.activeConditions || [];
  const attackRoll = describeAttackRoll(activeConditions, {
    extraDisadv: !!action._disadvantage,
  });

  return (
    <ExpandableCard
      containerSx={spellCardSx}
      disabled={!hasActionDetails}
      summary={({ toggle, disabled, open }) => (
          <Box onClick={disabled ? undefined : toggle} sx={{ ...spellRowSx, cursor: disabled ? 'default' : 'pointer' }}>
            {barCat && CAT_COLORS[barCat] && (
              <Box sx={{ width: 6, height: 28, borderRadius: 1, bgcolor: CAT_COLORS[barCat], flexShrink: 0, opacity: OPACITY.solid }} />
            )}

            <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
                <Typography sx={{ ...cardTitleSx, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {displayName || action.name}
                </Typography>
                {hasRollers ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5, flexWrap: 'wrap', flexShrink: 0 }}>
                    {Number.isFinite(action.attackBonus) ? (
                      <AttackRollButton
                        rawBonus={action.attackBonus}
                        exhaustionLevel={sheet?.exhaustionLevel}
                        label={formatRollTitle(action.name, 'Attack')}
                        advArg={attackRoll.advArg}
                        sources={attackRoll.sources}
                        tag={attackRoll.tag}
                        tooltip={attackRoll.tooltip}
                        disadv={attackRoll.disadv}
                        notProficient={!!action._notProficient}
                        critOn={action._weaponAttack ? getCritRange(C) : 20}
                        onRoll={onRoll}
                      />
                    ) : null}
                    <RollerButtons
                      rollers={rollers}
                      subject={action.rollLabelPrefix || action.name}
                      onShowToast={onShowToast}
                      buttonSx={inlineButtonSx}
                    />
                  </Box>
                ) : null}
              </Box>
              {(action.tags || []).length ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                  {action.tags.map((tag) => (
                    <MiniBadge key={tag.key} label={tag.label} color={tag.color} />
                  ))}
                </Box>
              ) : null}
            </Box>
          </Box>
      )}
      persistent={({ open }) => (
        <>
      {hasStatusRow ? (() => {
        const toggleCtx = { C, action, hasRes, resCur };
        const toggleField = toggleActiveField(action._toggleKey);
        const isActive = C?.[toggleField] === true;
        const toggleInfo = typeof action._toggleCondition === 'function'
          ? action._toggleCondition(toggleCtx) : {};
        const canToggleOn = !isActive && hasRes && resCur > 0
          && toggleInfo.canActivate !== false;
        const isSuppressed = isActive && toggleInfo.isSuppressed;
        const label = isSuppressed ? 'Suppressed' : (isActive ? 'Active' : 'Inactive');
        const statusTone = isSuppressed ? CHIP_TONES.negative : (isActive ? CHIP_TONES.positive : CHIP_TONES.info);
        const statusStyle = chipToneStyle(statusTone);
        return (
        <Box sx={persistentRowSx(uiAlpha(UI_COLORS.infoText, OPACITY.wash), !hasRes, open)}>
          <Typography sx={{ ...inlineMetaLabelSx, mr: 0.5 }}>Status</Typography>
          <Chip
            size="small"
            label={label}
            variant="outlined"
            onClick={() => {
              if (isActive) {
                onUpdateCharacter(prev => ({ ...prev, [toggleField]: false }));
              } else if (canToggleOn) {
                onUpdateCharacter(prev => ({ ...prev, [toggleField]: true }));
                onResChange?.(action.resKey, -1);
              }
            }}
            sx={{
              cursor: isActive || canToggleOn ? 'pointer' : 'not-allowed',
              fontSize: FONT_SIZES.xxs,
              ...TEXT_STYLES.title,
              ...statusStyle,
              '&:hover': { borderColor: (isActive || canToggleOn) ? statusTone : statusStyle.borderColor },
            }}
          />
        </Box>
        );
      })() : null}

      {hasRes ? (
        <Box sx={persistentRowSx(uiAlpha(UI_COLORS.accent, OPACITY.wash), true, open)}>
          {/* `resLabel`: the resource covers only part of the card (Totems: the Primal Knowledge Totem). */}
          <Typography sx={{ ...inlineMetaLabelSx, mr: 0.5 }}>{action.resLabel || (resTrack === 'used' ? 'Spent' : 'Uses')}</Typography>
          {safeMax === Infinity ? (
            typeof onResChange === 'function' ? (
              <Button
                size="small"
                variant="outlined"
                onClick={(e) => { e.stopPropagation(); onResChange(action.resKey, -1); }}
                sx={{ fontSize: FONT_SIZES.xs, ...TEXT_STYLES.title, minWidth: 0, py: 0.25, px: 0.5, color: UI_COLORS.accentText, borderColor: uiAlpha(UI_COLORS.accentText, OPACITY.line), '&:hover': { borderColor: UI_COLORS.accentText, bgcolor: uiAlpha(UI_COLORS.accentText, OPACITY.soft) } }}
              >{action.buttonLabel || (action.controller ? 'Open' : 'Use')}</Button>
            ) : (
              <Typography sx={{ fontSize: FONT_SIZES.md, color: UI_COLORS.accentText, ...TEXT_STYLES.figure }}>∞</Typography>
            )
          ) : (isPool || safeMax > 10) ? (
            <ResourceBar value={resCur} max={safeMax} onChange={(delta) => onResChange(action.resKey, delta)} />
          ) : (
            Array.from({ length: safeMax }, (_, i) => {
              const available = i >= safeMax - resCur;
              return (
                <PipButton
                  key={i}
                  size={10}
                  round
                  title={available ? 'Available' : 'Used'}
                  aria-label={`${action.name}: ${available ? 'spend use' : 'recover use'}`}
                  onClick={(e) => { e.stopPropagation(); onResChange(action.resKey, available ? -1 : 1); }}
                  sx={{
                    border: '1.5px solid',
                    bgcolor: available ? 'transparent' : UI_COLORS.accentText,
                    borderColor: available ? uiAlpha(UI_COLORS.accent, OPACITY.line) : UI_COLORS.accentText,
                  }}
                />
              );
            })
          )}
        </Box>
      ) : null}
        </>
      )}
      detailsSx={spellBodySx}
      details={hasActionDetails ? (
        <>
          {action._item ? <ItemPropertyTable item={action._item} sx={{ mb: 0.75 }} /> : null}
          {descriptionNode
            ? (cardInteractive ? <CollapsibleNote>{descriptionNode}</CollapsibleNote> : descriptionNode)
            : null}
          {action.choiceKey && onUpdateCharacter ? (
            <ChoicePicker action={action} C={C} onUpdateCharacter={onUpdateCharacter} onNotice={onNotice} />
          ) : null}
          <WeaponMasteryBlock mastery={action._weaponMastery} />
          {action._itemProperty ? <WeaponNoteBlock notes={[action._itemProperty]} /> : null}
          <WeaponNoteBlock notes={action._weaponNotes} />
          {DetailRenderer ? (
            <DetailRenderer
              action={action}
              character={C}
              sheet={sheet}
              resources={resources}
              onResChange={onResChange}
              resMax={resMax}
            />
          ) : null}
        </>
      ) : null}
    />
  );
}

// A card's builder choice, switched from the sheet: `choiceOptions` (a list,
// or a function of the character and the card) under `choiceKey`, saved as
// the builder saves it — a one-item list under its class's prefix.
function ChoicePicker({ action, C, onUpdateCharacter, onNotice }) {
  const choiceKey = `${action.choicePrefix || ''}${action.choiceKey}`;
  const options = typeof action.choiceOptions === 'function'
    ? action.choiceOptions({ character: C, action })
    : action.choiceOptions;
  if (!options || !options.length) return null;
  const q = String(asArray(readChoiceValue(C, choiceKey))[0] || '').toLowerCase();
  const match = options.find((o) => String(o.value).toLowerCase() === q);
  const activeValue = match ? match.value : '';

  const handleChange = (_, next) => {
    if (next === activeValue) return;
    // Exclusive ToggleButtonGroup yields null when the active button is clicked
    // again: clear the choice when the action opts in, otherwise ignore.
    if (!next) {
      if (!action.choiceAllowClear) return;
      onUpdateCharacter((prev) => {
        const choices = { ...(prev.choices || {}) };
        delete choices[choiceKey];
        return { ...prev, choices };
      });
      if (!action.choiceNoToast) onNotice?.('Choice Cleared', `${action.choiceLabel || 'Choice'} cleared`);
      return;
    }
    onUpdateCharacter((prev) => {
      const choices = { ...(prev.choices || {}) };
      choices[choiceKey] = [next];
      return { ...prev, choices };
    });
    if (!action.choiceNoToast) onNotice?.('Choice Updated', `${action.choiceLabel || 'Choice'}: ${next}`);
  };

  return (
    <Box sx={{ mt: 0.75, pt: 0.5, borderTop: '1px dashed', borderColor: 'divider' }}>
      <Typography sx={{ fontSize: FONT_SIZES.xs, color: UI_COLORS.accentText, ...TEXT_STYLES.title, mb: 0.25 }}>
        {action.choiceLabel || 'Active Option'}
      </Typography>
      <ToggleButtonGroup size="small" exclusive value={activeValue} onChange={handleChange}
        sx={{ flexWrap: 'wrap', gap: 0.5, '& .MuiToggleButton-root': { fontSize: FONT_SIZES.sm, px: 1, py: 0.5, border: 1, borderRadius: '999px !important' }, '& .MuiToggleButton-root:not(.Mui-selected)': { borderColor: 'divider', color: 'text.secondary', bgcolor: 'transparent' } }}
      >
        {options.map((opt) => (
          <ToggleButton key={opt.value} value={opt.value}>{opt.label}</ToggleButton>
        ))}
      </ToggleButtonGroup>
      {action.choiceRestNote ? (
        <Typography component="div" sx={{ ...TEXT_STYLES.note, fontSize: FONT_SIZES.xxs, mt: 0.25 }}>
          <RichInline text={action.choiceRestNote} keyPrefix={`choice-${action.choiceKey}`} />
        </Typography>
      ) : null}
    </Box>
  );
}
