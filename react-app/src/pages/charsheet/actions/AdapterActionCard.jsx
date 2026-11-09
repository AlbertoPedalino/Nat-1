import { Box, Button, Chip, Typography } from '@mui/material';
import { describeAttackRoll } from '../../../shared/character/combat/conditions.js';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import { getChoiceValue } from '../../../shared/character/progression/choiceUtils.js';
import { toggleActiveField } from '../state/toggleState.js';
import { CAT_COLORS } from './actionTags.js';
import { getActionRollers } from '../../../shared/character/dice/rollers.js';
import { WeaponMasteryBlock } from '../../../shared/character/combat/WeaponMasteryBlock.jsx';
import { WeaponNoteBlock } from '../../../shared/character/combat/WeaponNoteBlock.jsx';
import { inlineButtonSx, spellBodySx, spellRowSx } from '../spells/spellsTabStyles.js';
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
import { UI_COLORS, uiAlpha } from '../../../shared/ui/colors.js';
import { UI_FONTS } from '../../../shared/ui/fonts.js';
import { inlineMetaLabelSx } from '../../../shared/ui/PanelHeader.jsx';

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
    gap: '4px',
    px: '10px',
    py: '5px',
    border: 1,
    borderTop: 'none',
    borderColor: 'divider',
    borderRadius: isLast && !open ? '0 0 8px 8px' : 0,
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
      containerSx={{ overflow: 'hidden' }}
      disabled={!hasActionDetails}
      summary={({ toggle, disabled, open }) => (
          <Box onClick={disabled ? undefined : toggle} sx={{ ...spellRowSx, mb: 0, py: '7px', borderRadius: open || hasPersistentRows ? '8px 8px 0 0' : 1, cursor: disabled ? 'default' : 'pointer' }}>
            {barCat && CAT_COLORS[barCat] && (
              <Box sx={{ width: 6, height: 28, borderRadius: 1, bgcolor: CAT_COLORS[barCat], flexShrink: 0, opacity: 0.95 }} />
            )}

            <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                <Typography sx={{ flex: 1, fontSize: '0.78rem', fontWeight: 700, color: 'text.primary', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {displayName || action.name}
                </Typography>
                {hasRollers ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', flexWrap: 'wrap', flexShrink: 0 }}>
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, flexWrap: 'wrap' }}>
                  {action.tags.map((tag) => (
                    <MiniBadge key={tag.key} label={tag.label} color={tag.color} bg={tag.bg} />
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
        <Box sx={persistentRowSx(uiAlpha(UI_COLORS.blueSoft, 0.06), !hasRes, open)}>
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
              fontSize: '0.58rem',
              fontFamily: UI_FONTS.display,
              fontWeight: 700,
              letterSpacing: '0.06em',
              ...statusStyle,
              '&:hover': { borderColor: (isActive || canToggleOn) ? statusTone : statusStyle.borderColor },
            }}
          />
        </Box>
        );
      })() : null}

      {hasRes ? (
        <Box sx={persistentRowSx(uiAlpha(UI_COLORS.gold, 0.06), true, open)}>
          <Typography sx={{ ...inlineMetaLabelSx, mr: 0.5 }}>{resTrack === 'used' ? 'Spent' : 'Uses'}</Typography>
          {safeMax === Infinity ? (
            typeof onResChange === 'function' ? (
              <Button
                size="small"
                variant="outlined"
                onClick={(e) => { e.stopPropagation(); onResChange(action.resKey, -1); }}
                sx={{ fontSize: '0.6rem', fontFamily: UI_FONTS.display, letterSpacing: '0.06em', minWidth: 0, py: 0.2, px: 0.6, color: UI_COLORS.goldLight, borderColor: uiAlpha(UI_COLORS.goldLight, 0.35), '&:hover': { borderColor: UI_COLORS.goldLight, bgcolor: uiAlpha(UI_COLORS.goldLight, 0.08) } }}
              >{action.buttonLabel || (action.controller ? 'Open' : 'Use')}</Button>
            ) : (
              <Typography sx={{ fontSize: '0.7rem', color: UI_COLORS.goldLight, fontFamily: UI_FONTS.display, fontWeight: 700 }}>∞</Typography>
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
                    bgcolor: available ? 'transparent' : UI_COLORS.goldLight,
                    borderColor: available ? uiAlpha(UI_COLORS.gold, 0.35) : UI_COLORS.goldLight,
                  }}
                />
              );
            })
          )}
        </Box>
      ) : null}
        </>
      )}
      detailsSx={{ ...spellBodySx, mt: 0, mb: 0 }}
      details={hasActionDetails ? (
        <>
          {action._item ? <ItemPropertyTable item={action._item} sx={{ mb: '6px' }} /> : null}
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

const _CHOICE_PICKER_OPTIONS = {
  armorer_model: [
    { value: 'Guardian', label: 'Guardian (Defensive Tank)' },
    { value: 'Infiltrator', label: 'Infiltrator (Fast Striker)' },
    { value: 'Dreadnaught', label: 'Dreadnought (Force + Reach)' },
  ],
};

function ChoicePicker({ action, C, onUpdateCharacter, onNotice }) {
  const choiceKey = action.choiceKey;
  const options = action.choiceOptions || _CHOICE_PICKER_OPTIONS[choiceKey];
  if (!options || !options.length) return null;
  const current = getChoiceValue(C, choiceKey);
  const q = String(current || '').toLowerCase();
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
      choices[choiceKey] = next;
      return { ...prev, choices };
    });
    if (!action.choiceNoToast) onNotice?.('Choice Updated', `${action.choiceLabel || 'Choice'}: ${next}`);
  };

  return (
    <Box sx={{ mt: 0.7, pt: 0.5, borderTop: '1px dashed', borderColor: 'divider' }}>
      <Typography sx={{ fontSize: '0.6rem', color: UI_COLORS.goldLight, fontFamily: UI_FONTS.display, fontWeight: 700, letterSpacing: '0.08em', mb: 0.3 }}>
        {action.choiceLabel || 'Active Option'}
      </Typography>
      <ToggleButtonGroup size="small" exclusive value={activeValue} onChange={handleChange}
        sx={{ flexWrap: 'wrap', gap: '3px', '& .MuiToggleButton-root': { fontSize: '0.65rem', px: '8px', py: '3px', border: 1, borderColor: 'divider', borderRadius: '999px !important', color: 'text.secondary', bgcolor: 'transparent', '&.Mui-selected': { bgcolor: uiAlpha(UI_COLORS.gold, 0.14), color: UI_COLORS.goldLight, borderColor: UI_COLORS.gold } } }}
      >
        {options.map((opt) => (
          <ToggleButton key={opt.value} value={opt.value}>{opt.label}</ToggleButton>
        ))}
      </ToggleButtonGroup>
      <Typography component="div" sx={{ fontSize: '0.55rem', color: 'text.secondary', mt: 0.2, fontStyle: 'italic' }}>
        <RichInline text={action.choiceRestNote || "Change when you finish a Short or Long Rest (Smith's Tools required)."} keyPrefix={`choice-${action.choiceKey || 'note'}`} />
      </Typography>
    </Box>
  );
}
