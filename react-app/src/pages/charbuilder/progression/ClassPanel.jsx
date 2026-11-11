import { useEffect, useState } from 'react';
import { Box, Button, IconButton, List, ListItemButton, ListItemText, Paper, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { ChevronDown, ChevronUp, Plus, Trash2, TriangleAlert } from 'lucide-react';
import BuilderPanel from '../layout/BuilderPanel.jsx';
import SearchField from '../../../shared/ui/SearchField.jsx';
import { ExpandableCard } from '../../../shared/ui/ExpandableCard.jsx';
import SheetDialog from '../../../shared/ui/SheetDialog.jsx';
import { describeMulticlassProficiencies, getMulticlassProficiencies } from '../../../shared/character/progression/multiclassProficiencies.js';
import { checkMulticlassPrerequisite, multiclassBlockReason } from './multiclassRules.js';
import { classIcon } from '../../../shared/character/profile/classIcon.js';
import { hitDieFaces } from '../../../shared/character/combat/hp.js';
import { matchesQuery } from '../../../shared/content/searchText.js';
import { primaryClassLevel } from '../../../shared/character/progression/classLevel.js';
import { activeExtraClass } from '../state/activeClass.js';
import { FONT_WEIGHTS } from '../../../shared/ui/fonts.js';
import { OPACITY, UI_COLORS } from '../../../shared/ui/colors.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import MiniBadge from '../../../shared/ui/MiniBadge.jsx';
import { ENTITY_COLORS } from '../../../shared/ui/entityColors.js';
import { BUILDER_TEXT } from '../layout/builderText.js';

// Renders the multiclass proficiency summary (data shaped by
// describeMulticlassProficiencies). Pure view: a "grants nothing" note when the
// live class JSON carries no proficiency data, else a labelled list.
function MulticlassProfDetails({ className, profs }) {
  const rows = describeMulticlassProficiencies(className, profs);
  if (!rows.length) {
    return (
      <Typography sx={BUILDER_TEXT.hint}>
        This class grants no multiclass proficiencies.
      </Typography>
    );
  }
  return (
    <Stack spacing={0.5}>
      <Typography sx={{ ...BUILDER_TEXT.hint, fontWeight: FONT_WEIGHTS.bold }}>
        Multiclass proficiencies gained
      </Typography>
      {rows.map(({ label, values }) => (
        <Typography key={label} sx={BUILDER_TEXT.hint}>
          <Box component="span" sx={{ fontWeight: FONT_WEIGHTS.bold }}>{label}:</Box> {values.join(', ')}
        </Typography>
      ))}
    </Stack>
  );
}

function ClassRow({ cls, selected, onSelect, prereqMet = true, prereqReason = '', details = null }) {
  const Icon = classIcon(cls.name);
  const hitDie = `d${hitDieFaces(cls)}`;
  const saves = (cls.proficiency || []).map((save) => save.toUpperCase()).join(', ');
  return (
    <ExpandableCard
      details={details}
      containerSx={{ borderBottom: 1, borderColor: 'divider' }}
      detailsSx={{ px: 2, pt: 0.25, pb: 1.25, bgcolor: 'background.paper' }}
      summary={({ open, toggle, disabled: caretDisabled }) => (
        <Stack direction="row" sx={{ alignItems: 'stretch', minWidth: 0 }}>
          <ListItemButton
            selected={selected}
            disabled={!prereqMet}
            onClick={onSelect}
            sx={{ alignItems: 'flex-start', gap: 0.5, opacity: prereqMet ? 1 : OPACITY.edge, flexDirection: 'column', flex: 1, minWidth: 0 }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, width: '100%' }}>
              <Box sx={{ pt: 0.25 }}>
                <Icon size={ICON_SIZES.sm} />
              </Box>
              <ListItemText
                primary={<Typography sx={BUILDER_TEXT.itemName}>{cls.name}</Typography>}
                secondary={(
                  <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap', mt: 0.25 }}>
                    <MiniBadge label={`Hit Die ${hitDie}`} color={ENTITY_COLORS.class} />
                    {cls.primary ? <MiniBadge label={`Primary ${cls.primary}`} color={ENTITY_COLORS.class} /> : null}
                    {saves ? <MiniBadge label={`Saves ${saves}`} color={ENTITY_COLORS.class} /> : null}
                    {cls.ruleClass ? <MiniBadge label={`Skin of ${cls.ruleClass.name}`} color={ENTITY_COLORS.class} /> : null}
                  </Stack>
                )}
                slotProps={{ secondary: { component: 'div' } }}
              />
              <MiniBadge label={cls.source} color={UI_COLORS.textSecondary} />
            </Box>
            {prereqReason && (
              <Typography sx={{ ...BUILDER_TEXT.hint, color: 'warning.main', ml: 3, mb: 0.5 }}>
                {prereqReason}
              </Typography>
            )}
          </ListItemButton>
          {!caretDisabled ? (
            <IconButton
              size="small"
              aria-label={open ? `Collapse ${cls.name}` : `Expand ${cls.name}`}
              onClick={toggle}
              sx={{ borderRadius: 0, px: 1, color: 'text.secondary', alignSelf: 'stretch' }}
            >
              {open ? <ChevronUp size={ICON_SIZES.md} /> : <ChevronDown size={ICON_SIZES.md} />}
            </IconButton>
          ) : null}
        </Stack>
      )}
    />
  );
}

function checkMcPrereq(character, className) {
  const { met, reason } = checkMulticlassPrerequisite(character, className);
  return { met, reason };
}

export default function ClassPanel({ state, character, dispatch }) {
  // { action, title, confirmLabel, confirmColor?, message, note } — a destructive class edit awaiting confirmation.
  const [pendingConfirm, setPendingConfirm] = useState(null);
  const classes = state.data.classes;
  const search = state.search.classes || '';
  const visibleClasses = classes.filter((cls) => matchesQuery(search, cls.name, cls.source));
  const activeExtra = activeExtraClass(character);
  const isExtraTab = !!activeExtra;
  const activeClass = activeExtra ? activeExtra.cls : character.cls;
  const activeLevel = activeExtra ? Number(activeExtra.level || 1) : primaryClassLevel(character);
  const PanelIcon = classIcon(activeExtra?.name || character.className);
  const primaryLevel = primaryClassLevel(character);
  const canAddMulticlass = Number(character.level || 1) < 20
    && !character.extraClasses.some((extra) => !extra?.name);

  useEffect(() => {
    setPendingConfirm(null);
  }, [character.activeClassTab, character.className, character.classSource, activeExtra?.name, activeExtra?.source]);

  const requestRemove = () => {
    const action = { type: 'multiclass/remove', index: character.activeClassTab - 1 };
    // An empty tab holds no choices, so there is nothing to lose.
    if (!activeExtra?.name) {
      dispatch(action);
      return;
    }
    setPendingConfirm({
      action,
      title: 'Remove multiclass?',
      confirmLabel: 'Remove class',
      confirmColor: 'error',
      message: (
        <>
          Remove <Box component="strong">{activeExtra.name} Lv {activeExtra.level || 1}</Box> from this character?
        </>
      ),
      note: 'Its levels and all choices associated with it will be lost.',
    });
  };

  return (
    <BuilderPanel tone={ENTITY_COLORS.class}
      title="Class"
      icon={PanelIcon}
      note={activeExtra ? 'Selecting multiclass class' : 'Selecting primary class'}
      action={
        <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap', mt: 0.5 }}>
          {activeExtra ? (
            <Button size="small" color="error" startIcon={<Trash2 size={ICON_SIZES.md} />} onClick={requestRemove}>
              Remove
            </Button>
          ) : null}
          <Button
            size="small"
            startIcon={<Plus size={ICON_SIZES.md} />}
            disabled={!canAddMulticlass}
            onClick={() => dispatch({ type: 'multiclass/add' })}
          >
            Multiclass
          </Button>
        </Stack>
      }
    >
      <Stack spacing={0.75}>
        <ToggleButtonGroup value={character.activeClassTab} exclusive size="small" onChange={(_, tab) => tab != null && dispatch({ type: 'class-tab/set', tab })}>
          <ToggleButton value={0}>{character.className || 'Primary'} Lv {primaryLevel}</ToggleButton>
          {character.extraClasses.map((extraClass, index) => (
            <ToggleButton key={`${extraClass.name}-${index}`} value={index + 1}>
              {extraClass.name || `Class ${index + 2}`} Lv {extraClass.level || 1}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        {activeClass?.isHero && activeLevel < 3 ? (
          <Typography sx={{ ...BUILDER_TEXT.hint, color: 'warning.main' }}>
            {activeClass.name} is a hero class: it normally starts at level 3. Below that it needs your DM&apos;s permission.
          </Typography>
        ) : null}
        <SearchField
          value={search}
          placeholder="Search classes"
          onChange={(value) => dispatch({ type: 'search/set', scope: 'classes', value })}
          size="medium"
          iconSize={14}
        />
        <Paper variant="outlined" sx={{ maxHeight: 390, overflow: 'auto' }}>
          <List dense disablePadding>
            {visibleClasses.map((cls) => {
              const selected = activeExtra
                ? activeExtra.name === cls.name && activeExtra.source === cls.source
                : character.className === cls.name && character.classSource === cls.source;
              const hasLevelRoom = Boolean(activeExtra?.name) || Number(character.level || 1) < 20;
              const { met: prereqMet, reason: prereqReason } = isExtraTab && !selected
                ? !hasLevelRoom
                  ? { met: false, reason: 'Maximum total level reached' }
                  : multiclassBlockReason(character, cls, { replacingIndex: character.activeClassTab - 1 })
                    ? { met: false, reason: multiclassBlockReason(character, cls, { replacingIndex: character.activeClassTab - 1 }) }
                    : checkMcPrereq(character, cls.name)
                : { met: true, reason: '' };
              const profGained = isExtraTab ? getMulticlassProficiencies(cls.name, cls) : null;
              const details = isExtraTab ? <MulticlassProfDetails className={cls.name} profs={profGained} /> : null;
              return (
                <ClassRow
                  key={`${cls.name}-${cls.source}`}
                  cls={cls}
                  selected={selected}
                  prereqMet={prereqMet}
                  prereqReason={prereqReason}
                  details={details}
                  onSelect={() => {
                    if (selected) return;
                    const currentName = activeExtra ? activeExtra.name : character.className;
                    const currentSource = activeExtra ? activeExtra.source : character.classSource;
                    const action = activeExtra
                      ? { type: 'extra-class/select', index: character.activeClassTab - 1, className: cls.name, source: cls.source, classObject: cls }
                      : { type: 'class/select', className: cls.name, source: cls.source, classObject: cls };
                    if (currentName) {
                      const currentLabel = currentSource ? `${currentName} (${currentSource})` : currentName;
                      const nextLabel = cls.source ? `${cls.name} (${cls.source})` : cls.name;
                      setPendingConfirm({
                        action,
                        title: 'Change class?',
                        confirmLabel: 'Change class',
                        message: (
                          <>
                            Replace <Box component="strong">{currentLabel}</Box> with{' '}
                            <Box component="strong">{nextLabel}</Box>?
                          </>
                        ),
                        note: 'Choices associated with the previous class will be reset.',
                      });
                      return;
                    }
                    dispatch(action);
                  }}
                />
              );
            })}
            {!visibleClasses.length ? (
              <Typography sx={{ color: 'text.secondary', px: 1, py: 1.25 }}>
                No classes found.
              </Typography>
            ) : null}
          </List>
        </Paper>
      </Stack>
      {pendingConfirm && (
        <SheetDialog
          open
          title={pendingConfirm.title}
          icon={<TriangleAlert size={ICON_SIZES.xl} />}
          onClose={() => setPendingConfirm(null)}
          actions={(
            <>
              <Button autoFocus variant="outlined" onClick={() => setPendingConfirm(null)}>Cancel</Button>
              <Button variant="contained" color={pendingConfirm.confirmColor || 'primary'} onClick={() => {
                dispatch(pendingConfirm.action);
                setPendingConfirm(null);
              }}>{pendingConfirm.confirmLabel}</Button>
            </>
          )}
        >
          <Stack spacing={1.5}>
            <Typography>{pendingConfirm.message}</Typography>
            <Typography sx={{ ...BUILDER_TEXT.body, color: 'text.secondary' }}>{pendingConfirm.note}</Typography>
          </Stack>
        </SheetDialog>
      )}
    </BuilderPanel>
  );
}
