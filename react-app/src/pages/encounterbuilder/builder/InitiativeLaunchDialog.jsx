import { useMemo, useState } from 'react';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import { Swords } from 'lucide-react';
import { initiativeRoster } from '../combat/combat.js';
import { advArgFor, rollModeLabel, withExtraSource } from '../../../shared/character/dice/advantage.js';

// Launch with initiative advantage/disadvantage for the creatures that need it
// (surprise, a ruling), one row per creature — the second of three goblins can
// be surprised alone. Opened from the settings button beside Launch; a plain
// Launch never asks. Nothing is stored: the choice is for this launch only.
// Each row adds to what the creature already has (a player's synced effects
// and conditions), so any advantage plus any disadvantage is a straight roll.

const SIDES = [
  { side: 'party', label: 'Party' },
  { side: 'monsters', label: 'Monsters' },
];

export default function InitiativeLaunchDialog({ open, onClose, encounter, players, onLaunch }) {
  return open ? (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <LaunchPanel encounter={encounter} players={players} onClose={onClose} onLaunch={onLaunch} />
    </Dialog>
  ) : null;
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
    <>
      <DialogTitle>Initiative at launch</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
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
                <Box sx={rowSx}>
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
                    <Box key={row.key} sx={rowSx}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" noWrap sx={{ fontWeight: 700 }}>{row.name}</Typography>
                        {own || choice ? (
                          <Typography variant="caption" color="text.secondary" noWrap component="div">
                            {own ? `Own: ${rollModeLabel(advArgFor(row.sources))} · ` : ''}→ {rollModeLabel(result)}
                          </Typography>
                        ) : null}
                      </Box>
                      <ModeToggle
                        label={row.name}
                        value={choice || 'none'}
                        onChange={(value) => choose([row.key], value)}
                      />
                    </Box>
                  );
                })}
              </Stack>
            );
          })}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" startIcon={<Swords size={16} />} onClick={() => onLaunch(choices)}>
          Launch
        </Button>
      </DialogActions>
    </>
  );
}

function ModeToggle({ label, value, onChange }) {
  return (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={value}
      onChange={(_event, next) => { if (next) onChange(next); }}
      aria-label={`${label} initiative`}
      sx={{ flexShrink: 0 }}
    >
      <ToggleButton value="disadv" color="error" aria-label={`${label}: disadvantage`} sx={toggleSx}>DIS</ToggleButton>
      <ToggleButton value="none" aria-label={`${label}: normal`} sx={toggleSx}>—</ToggleButton>
      <ToggleButton value="adv" color="success" aria-label={`${label}: advantage`} sx={toggleSx}>ADV</ToggleButton>
    </ToggleButtonGroup>
  );
}

const rowSx = { display: 'flex', alignItems: 'center', gap: 1 };

const toggleSx = { px: 1, py: 0.25, fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.06em', minWidth: 38 };
