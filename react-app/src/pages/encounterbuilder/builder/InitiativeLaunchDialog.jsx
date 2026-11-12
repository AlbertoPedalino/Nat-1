import { useMemo, useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { Swords } from 'lucide-react';
import { initiativeRoster } from '../../../shared/encounter/combat.js';
import { advArgFor, rollModeLabel, withExtraSource } from '../../../shared/character/dice/advantage.js';
import SheetDialog, { CancelButton } from '../../../shared/ui/SheetDialog.jsx';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import EntityRow from '../../../shared/ui/EntityRow.jsx';
import ChoiceToggle from '../../../shared/ui/ChoiceToggle.jsx';

// Launch with initiative advantage/disadvantage for the creatures that need it
// (surprise, a ruling), one row per creature — the second of three goblins can
// be surprised alone. Opened from the settings button beside Launch; a plain
// Launch never asks. Nothing is stored: the choice is for this launch only.
// Each row adds to what the creature already has (a player's synced
// conditions), so any advantage plus any disadvantage is a straight roll.

const SIDES = [
  { side: 'party', label: 'Party' },
  { side: 'monsters', label: 'Monsters' },
];

export default function InitiativeLaunchDialog({ open, onClose, encounter, players, onLaunch }) {
  return open ? <LaunchPanel encounter={encounter} players={players} onClose={onClose} onLaunch={onLaunch} /> : null;
}

// Mounted only while open, so every opening starts from "everyone normal".
function LaunchPanel({ encounter, players, onClose, onLaunch }) {
  const rows = useMemo(() => initiativeRoster(encounter, players), [encounter, players]);
  const [choices, setChoices] = useState({});

  const choose = (keys, value) => setChoices((current) => {
    const next = { ...current };
    for (const key of keys) {
      if (value === 'adv' || value === 'disadv') next[key] = value;
      else delete next[key];
    }
    return next;
  });

  return (
    <SheetDialog
      open
      onClose={onClose}
      title="Initiative at launch"
      icon={<Swords size={ICON_SIZES.sm} />}
      showClose
      actions={(
        <>
          <CancelButton onClick={onClose} />
          <Button variant="contained" startIcon={<Swords size={ICON_SIZES.md} />} onClick={() => onLaunch(choices)}>
            Launch
          </Button>
        </>
      )}
    >
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
        Set only the exceptions; everyone else rolls as usual. Any advantage plus any disadvantage is a straight roll.
      </Typography>
      <Stack spacing={2}>
        {SIDES.map(({ side, label }) => {
          const sideRows = rows.filter((row) => row.side === side);
          if (!sideRows.length) return null;
          const keys = sideRows.map((row) => row.key);
          const values = new Set(keys.map((key) => choices[key] || 'none'));
          return (
            <Stack key={side} spacing={0.75}>
              <Box sx={sideHeaderSx}>
                <Typography variant="overline" sx={{ flex: 1, color: 'primary.main' }}>{label}</Typography>
                <ModeToggle
                  label={`All ${label.toLowerCase()}`}
                  value={values.size === 1 ? [...values][0] : null}
                  onChange={(value) => choose(keys, value)}
                />
              </Box>
              {sideRows.map((row) => {
                const choice = choices[row.key];
                const own = row.sources.adv || row.sources.disadv;
                const result = advArgFor(choice ? withExtraSource(row.sources, choice) : row.sources);
                return (
                  <EntityRow
                    key={row.key}
                    surface="none"
                    title={row.name}
                    subtitle={own || choice
                      ? `${own ? `Own: ${rollModeLabel(advArgFor(row.sources))} · ` : ''}→ ${rollModeLabel(result)}`
                      : null}
                    actions={(
                      <ModeToggle
                        label={row.name}
                        value={choice || 'none'}
                        onChange={(value) => choose([row.key], value)}
                      />
                    )}
                  />
                );
              })}
            </Stack>
          );
        })}
      </Stack>
    </SheetDialog>
  );
}

function ModeToggle({ label, value, onChange }) {
  return (
    <ChoiceToggle
      ariaLabel={`${label} initiative`}
      value={value}
      onChange={onChange}
      options={[
        { value: 'disadv', label: 'DIS', color: 'error', ariaLabel: `${label}: disadvantage` },
        { value: 'none', label: '—', ariaLabel: `${label}: normal` },
        { value: 'adv', label: 'ADV', color: 'success', ariaLabel: `${label}: advantage` },
      ]}
      sx={{ flexShrink: 0 }}
    />
  );
}

// A side's heading row: its name and the toggle for all of it.
const sideHeaderSx = { display: 'flex', alignItems: 'center', gap: 1 };

