import { useMemo } from 'react';
import { Button, Stack } from '@mui/material';
import { useSheetActions } from '../state/SheetActionsContext.jsx';
import { beastSummary, findBeast, parseBeastRef } from '../../../shared/character/forms/beasts.js';
import { BeastTitle, BeastStatBlock, BeastPickerRow, dismissButtonSx } from './BeastStatBlock.jsx';
import { useBeastsDb, useFeatureForms } from './useBeastsDb.js';
import {
  getActiveWildShape,
  enterWildShapePatch,
  exitWildShapePatch,
} from '../../../shared/character/forms/wildShapeForm.js';
import { featureFormSnapshot, wildShapeTempHp } from '../../../shared/character/forms/wildShapeRules.js';
import { classLevel, hasClassFeature } from '../../../shared/character/progression/classLevel.js';
import { UI_COLORS } from '../../../shared/ui/colors.js';
import { baseChoiceKey } from '../../../shared/character/progression/choiceUtils.js';
import DetailPanel, { DetailNote } from '../layout/DetailPanel.jsx';
import { tempHpAfter } from '../../../shared/character/combat/vitals.js';
import { filterByBooks } from '../../../shared/content/booksView.js';
import { GAME_ICONS } from '../../../shared/ui/gameIcons.js';

// Sheet panel for the Wild Shape action. Lists the player's known beast forms
// (chosen in the builder), and transforms into / reverts from one. Transform
// resolves the beast snapshot, writes it to C.wildShape, swaps in the beast HP
// pool and Temporary HP — every stat/AC/HP override flows from that one field.

const druidLevel = (C) => classLevel(C, 'Druid');

function knownFormRefs(C) {
  const choices = C?.choices || {};
  for (const [k, v] of Object.entries(choices)) {
    if (baseChoiceKey(k) === 'druid_wild_shape_forms') {
      return Array.isArray(v) ? v : (v ? [v] : []);
    }
  }
  return [];
}

export default function WildShapePanel({ action, character, sheet, resources, onResChange }) {
  const { onUpdateCharacter, onUpdateSheet } = useSheetActions();
  const beastsDb = useBeastsDb();
  const featureForms = useFeatureForms();
  const resKey = action?.resKey;
  const usesLeft = resKey ? Number(resources?.[resKey] ?? 0) : Infinity;

  const lv = druidLevel(character);
  const active = getActiveWildShape(character);
  const refs = useMemo(() => knownFormRefs(character), [character]);
  const forms = useMemo(() => refs
    .map((ref) => ({ ref, beast: findBeast(beastsDb, ref), parsed: parseBeastRef(ref) }))
    .filter((f) => f.parsed), [refs, beastsDb]);
  // Forms a feature gives (Circle Forms: Bear Form, Cat Form), resolved for
  // this druid; no pick in the builder.
  const extraForms = useMemo(() => filterByBooks(featureForms, character)
    .filter((form) => hasClassFeature(character, form.requiresFeature))
    .map((form) => ({ form, snapshot: featureFormSnapshot(character, form) }))
    .filter((entry) => entry.snapshot), [featureForms, character]);

  const transform = (beast) => {
    if (!beast || !onUpdateCharacter) return;
    // Wild Shape costs one use unless you're already shaped (switching forms is
    // re-casting Wild Shape, so it also spends a use). Block when none are left.
    if (resKey && typeof onResChange === 'function') {
      if (usesLeft <= 0) return;
      onResChange(resKey, -1);
    }
    onUpdateCharacter((prev) => ({ ...prev, ...enterWildShapePatch(prev, beast, wildShapeTempHp(prev, beast, druidLevel(prev))) }));
    // The HP block reads Temp HP from sheet state, which isn't re-derived from the
    // character patch — mirror the Druid-level grant so it shows immediately.
    const granted = wildShapeTempHp(character, beast, druidLevel(character));
    onUpdateSheet?.({ tempHP: tempHpAfter(sheet?.tempHP, 'grantTempHp', granted) });
  };
  const revert = () => {
    if (!onUpdateCharacter) return;
    // Temp HP persists after reverting, so only the form is ended here.
    onUpdateCharacter((prev) => ({ ...prev, ...exitWildShapePatch() }));
  };

  if (active) {
    const b = active.beast;
    return (
      <DetailPanel
        icon={GAME_ICONS.beast}
        title="Transformed —"
        titleNode={<BeastTitle name={b.name} source={b.source} />}
        aside={(
          <Button size="small" onClick={revert} sx={dismissButtonSx}>
            Revert to normal form
          </Button>
        )}
      >
        {b.tempHpGrant != null
          ? <BeastStatBlock b={b} typeLabel="Wild Shape form" hpLabel="Temp HP" showCr={false} />
          : <BeastStatBlock b={b} typeLabel="Beast" hpLabel="Form HP" tempHP={wildShapeTempHp(character, b, lv)} />}
        <DetailNote>
          Your own HP, INT/WIS/CHA, features and proficiencies are kept; saves &amp; skills use the higher of your bonus or the form's.
        </DetailNote>
      </DetailPanel>
    );
  }

  return (
    <DetailPanel icon={GAME_ICONS.beast} title="Known Beast Forms">
      {!forms.length && !extraForms.length ? (
        <DetailNote sx={{ mt: 0 }}>
          No forms chosen yet — pick beasts in the character builder (Class Choices → Wild Shape).
        </DetailNote>
      ) : (
        <Stack spacing={0.5}>
          {forms.map(({ ref, beast, parsed }) => (
            <BeastPickerRow
              key={ref}
              beast={beast}
              name={parsed.name}
              source={beast?.source || parsed.source}
              summary={beast ? beastSummary(beast) : 'Beast data unavailable'}
              summaryColor={beast ? undefined : UI_COLORS.dangerMuted}
              actionLabel="Transform"
              onAction={() => transform(beast)}
              actionDisabled={!beast || usesLeft <= 0}
              typeLabel="Beast"
              hpLabel="Form HP"
            />
          ))}
          {extraForms.map(({ form, snapshot }) => (
            <BeastPickerRow
              key={`${form.name}|${form.source}`}
              beast={snapshot}
              name={form.name}
              source={form.source}
              summary={`${form.requiresFeature} · ${snapshot.size} · AC ${snapshot.ac ?? '—'} · Temp HP ${snapshot.tempHpGrant ?? 0}`}
              actionLabel="Transform"
              onAction={() => transform(snapshot)}
              actionDisabled={usesLeft <= 0}
              typeLabel="Wild Shape form"
              hpLabel="Temp HP"
            />
          ))}
        </Stack>
      )}
      {lv >= 2 ? (
        <DetailNote warn={usesLeft <= 0}>
          {usesLeft <= 0
            ? 'No Wild Shape uses left — finish a Short or Long Rest.'
            : `Transform spends one Wild Shape use (${usesLeft} left).`}
        </DetailNote>
      ) : null}
    </DetailPanel>
  );
}
