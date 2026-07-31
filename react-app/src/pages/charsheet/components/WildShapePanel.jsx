import { useMemo } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { PawPrint } from 'lucide-react';
import { useSheetActions } from '../context/SheetActionsContext.jsx';
import { findBeast, parseBeastRef } from '../../../shared/character/beasts.js';
import { BeastNameLink, BeastStatBlock, BeastPickerRow, panelSx, headerSx, subSx, dismissButtonSx } from './BeastStatBlock.jsx';
import { useBeastsDb } from '../hooks/useBeastsDb.js';
import {
  getActiveWildShape,
  enterWildShapePatch,
  exitWildShapePatch,
} from '../../../shared/character/wildShapeForm.js';
import { classLevel } from '../../../shared/character/classLevel.js';

// Sheet panel for the Wild Shape action. Lists the player's known beast forms
// (chosen in the builder), and transforms into / reverts from one. Transform
// resolves the beast snapshot, writes it to C.wildShape, swaps in the beast HP
// pool and Temporary HP — every stat/AC/HP override flows from that one field.

const druidLevel = (C) => classLevel(C, 'Druid');

function knownFormRefs(C) {
  const choices = C?.choices || {};
  for (const [k, v] of Object.entries(choices)) {
    if (k.replace(/^mc\d+_/, '') === 'druid_wild_shape_forms') {
      return Array.isArray(v) ? v : (v ? [v] : []);
    }
  }
  return [];
}

export default function WildShapePanel({ action, character, sheet, resources, onResChange }) {
  const { onUpdateCharacter, onUpdateSheet } = useSheetActions();
  const beastsDb = useBeastsDb();
  const resKey = action?.resKey;
  const usesLeft = resKey ? Number(resources?.[resKey] ?? 0) : Infinity;

  const lv = druidLevel(character);
  const active = getActiveWildShape(character);
  const refs = useMemo(() => knownFormRefs(character), [character]);
  const forms = useMemo(() => refs
    .map((ref) => ({ ref, beast: findBeast(beastsDb, ref), parsed: parseBeastRef(ref) }))
    .filter((f) => f.parsed), [refs, beastsDb]);

  const transform = (beast) => {
    if (!beast || !onUpdateCharacter) return;
    // Wild Shape costs one use unless you're already shaped (switching forms is
    // re-casting Wild Shape, so it also spends a use). Block when none are left.
    if (resKey && typeof onResChange === 'function') {
      if (usesLeft <= 0) return;
      onResChange(resKey, -1);
    }
    onUpdateCharacter((prev) => ({ ...prev, ...enterWildShapePatch(prev, beast, druidLevel(prev)) }));
    // The HP block reads Temp HP from sheet state, which isn't re-derived from the
    // character patch — mirror the Druid-level grant so it shows immediately.
    const granted = Math.max(0, druidLevel(character));
    onUpdateSheet?.({ tempHP: Math.max(Number(sheet?.tempHP || 0), granted) });
  };
  const revert = () => {
    if (!onUpdateCharacter) return;
    // Temp HP persists after reverting, so only the form is ended here.
    onUpdateCharacter((prev) => ({ ...prev, ...exitWildShapePatch() }));
  };

  if (active) {
    const b = active.beast;
    return (
      <Box onClick={(e) => e.stopPropagation()} sx={panelSx}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mb: 0.5 }}>
          <PawPrint size={14} color="#edd48a" />
          <Typography sx={headerSx} component="span">Transformed —</Typography>
          <BeastNameLink name={b.name} source={b.source} sx={headerSx} />
          <Button size="small" onClick={revert} sx={{ ...dismissButtonSx, ml: 'auto' }}>
            Revert to normal form
          </Button>
        </Box>
        <BeastStatBlock b={b} typeLabel="Beast" hpLabel="Form HP" tempHP={lv} />
        <Typography sx={{ ...subSx, fontStyle: 'italic', mt: 0.6 }}>
          Your own HP, INT/WIS/CHA, features and proficiencies are kept; saves &amp; skills use the higher of your bonus or the form's.
        </Typography>
      </Box>
    );
  }

  return (
    <Box onClick={(e) => e.stopPropagation()} sx={panelSx}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mb: 0.5 }}>
        <PawPrint size={14} color="#edd48a" />
        <Typography sx={headerSx}>Known Beast Forms</Typography>
      </Box>
      {!forms.length ? (
        <Typography sx={{ ...subSx, fontStyle: 'italic' }}>
          No forms chosen yet — pick beasts in the character builder (Class Choices → Wild Shape).
        </Typography>
      ) : (
        <Stack spacing={0.5}>
          {forms.map(({ ref, beast, parsed }) => (
            <BeastPickerRow
              key={ref}
              beast={beast}
              name={parsed.name}
              source={beast?.source || parsed.source}
              summary={beast
                ? `CR ${beast.cr} · ${beast.size} · AC ${beast.ac ?? '—'} · HP ${beast.hp.average}`
                : 'Beast data unavailable'}
              summaryColor={beast ? undefined : '#c98a8a'}
              actionLabel="Transform"
              onAction={() => transform(beast)}
              actionDisabled={!beast || usesLeft <= 0}
              typeLabel="Beast"
              hpLabel="Form HP"
            />
          ))}
        </Stack>
      )}
      {lv >= 2 ? (
        <Typography sx={{ ...subSx, fontStyle: 'italic', mt: 0.6, color: usesLeft <= 0 ? '#c98a8a' : 'text.secondary' }}>
          {usesLeft <= 0
            ? 'No Wild Shape uses left — finish a Short or Long Rest.'
            : `Transform spends one Wild Shape use (${usesLeft} left).`}
        </Typography>
      ) : null}
    </Box>
  );
}
