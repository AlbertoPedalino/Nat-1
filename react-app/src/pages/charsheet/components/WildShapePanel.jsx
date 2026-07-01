import { useMemo } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { PawPrint, RotateCcw } from 'lucide-react';
import { useSheetActions } from '../context/SheetActionsContext.jsx';
import { findBeast, parseBeastRef } from '../../../shared/character/beasts.js';
import { BeastNameLink, BeastStatBlock, panelSx, headerSx, subSx, rowSx } from './BeastStatBlock.jsx';
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
        </Box>
        <BeastStatBlock b={b} typeLabel="Beast" hpLabel="Form HP" tempHP={lv} />
        <Typography sx={{ ...subSx, fontStyle: 'italic', mt: 0.6 }}>
          Your own HP, INT/WIS/CHA, features and proficiencies are kept; saves &amp; skills use the higher of your bonus or the form's.
        </Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={<RotateCcw size={13} />}
          onClick={revert}
          sx={{ mt: 0.8, fontSize: '0.7rem', borderColor: 'rgba(202,165,80,0.5)', color: '#edd48a' }}
        >
          Revert to normal form
        </Button>
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
            <Box key={ref} sx={rowSx}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <BeastNameLink name={parsed.name} source={beast?.source || parsed.source} sx={{ fontSize: '0.8rem' }} />
                {beast ? (
                  <Typography noWrap sx={subSx}>{`CR ${beast.cr} · ${beast.size} · AC ${beast.ac ?? '—'} · HP ${beast.hp.average}`}</Typography>
                ) : (
                  <Typography noWrap sx={{ ...subSx, color: '#c98a8a' }}>Beast data unavailable</Typography>
                )}
              </Box>
              <Button
                size="small"
                variant="outlined"
                disabled={!beast || usesLeft <= 0}
                onClick={() => transform(beast)}
                sx={{ fontSize: '0.68rem', flexShrink: 0, borderColor: 'rgba(202,165,80,0.5)', color: '#edd48a' }}
              >
                Transform
              </Button>
            </Box>
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
