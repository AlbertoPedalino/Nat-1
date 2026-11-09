import { useState } from 'react';
import {
  Avatar, Box, Button, Collapse, IconButton, LinearProgress, Paper, Stack, TextField, Tooltip,
  Typography,
} from '@mui/material';
import { ChevronDown, ChevronUp, ExternalLink, HeartPulse, Shield, Sparkles, X } from 'lucide-react';
import HpStepper from '../../../shared/character/combat/HpStepper.jsx';
import { campaignSheetUrl } from '../../../shared/character/profile/characterRoutes.js';
import { useEncounterBuilder } from '../state/EncounterBuilderContext.jsx';
import CombatantConditions from './CombatantConditions.jsx';
import CombatantReminders from './CombatantReminders.jsx';
import MonsterToken from '../../../shared/bestiary/MonsterToken.jsx';
import PortraitBadge from '../../../shared/character/profile/PortraitBadge.jsx';
import { signed } from '../../../shared/ui/numberFormat.js';
import { confirmAction } from '../../../shared/ui/confirmAction.js';
import { hpToneColor } from '../../../shared/character/combat/vitals.js';
import { HP_TONE_COLORS } from '../../../shared/ui/colors.js';
import DeathSaveDots from '../../../shared/character/combat/DeathSaveDots.jsx';
import {
  nameSpanSx, rowSx, removeButtonSx, identityClusterSx, avatarBaseSx, nameButtonSx,
  sheetLinkButtonSx, acBadgeSx, acLabelSx, acValueSx, conditionsRowSx, effectsRowSx, hpSummaryRowSx,
  hpToggleSx, hpFlagSx, hpDetailsSx, collapseSx, hpPanelRowSx, hpValueRowSx, hpFieldSx, hpMaxSx,
  hpBarSx, cardSx, hpRowSx, buildActiveSx, deadSx,
} from './combatantCardStyles.js';
import { atDeathsDoor } from '../../../shared/character/combat/mortality.js';
import { FONT_WEIGHTS } from '../../../shared/ui/fonts.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';

export default function CombatantCard({ combatant, active }) {
  const { dispatch } = useEncounterBuilder();
  const [hpAmt, setHpAmt] = useState('5');
  const [tempAmt, setTempAmt] = useState('5');
  const [modAmt, setModAmt] = useState('5');
  // Temp HP / max-HP-modifier rows are secondary: collapsed by default to keep
  // the initiative list scannable. When collapsed, an active value still shows
  // as a flag next to the HP fields so nothing goes silently missing.
  const [hpDetailsOpen, setHpDetailsOpen] = useState(false);
  const isMonster = combatant.type === 'monster';
  const hpPct = combatant.hpMax ? Math.max(0, Math.round((combatant.hpCurrent / combatant.hpMax) * 100)) : 100;
  const isDown = atDeathsDoor({ player: !isMonster, hp: combatant.hpCurrent }) && Boolean(combatant.deathSaves);
  const tempHp = Number(combatant.tempHP) || 0;
  const maxHpBonus = Number(combatant.maxHPBonus) || 0;
  const maxHpBonusText = signed(maxHpBonus);

  const openDetails = () => {
    if (combatant.monsterData) {
      dispatch({ type: 'selectStatblock', payload: { monster: combatant.monsterData, combatantId: combatant.id } });
      return;
    }
    if (!isMonster) {
      dispatch({
        type: 'selectStatblock',
        payload: { playerSourceId: combatant.sourceId || null, combatantId: combatant.id },
      });
    }
  };

  const remove = () => {
    if (!confirmAction('Remove this combatant?')) return;
    dispatch({ type: 'removeCombatant', id: combatant.id });
  };

  return (
    <Paper
      aria-current={active ? 'true' : undefined}
      sx={(theme) => ({
        ...cardSx,
        ...(active ? buildActiveSx(theme) : null),
        ...(combatant.isDead ? deadSx : null),
      })}
    >
      <Tooltip title="Remove">
        <IconButton color="error" onClick={remove} size="small" sx={removeButtonSx} aria-label="Remove combatant">
          <X size={ICON_SIZES.sm} />
        </IconButton>
      </Tooltip>
      <Box sx={rowSx}>
        {/* Identity cluster: initiative + token + name + AC */}
        <Box sx={identityClusterSx}>
          <TextField
            size="small"
            label="Init"
            type="number"
            value={combatant.initiative}
            onChange={(event) => dispatch({ type: 'setInitiative', id: combatant.id, value: event.target.value })}
            sx={{ width: 62, flex: '0 0 auto' }}
          />
          <Stack direction="row" spacing={1} sx={{ minWidth: 0, alignItems: 'center', flex: 1 }}>
            {isMonster && combatant.monsterData ? (
              <Box onClick={openDetails} sx={{ cursor: 'pointer' }}>
                <MonsterToken monster={combatant.monsterData} size={34} fallbackText={combatant.name?.[0]} />
              </Box>
            ) : (
              <PortraitBadge
                path={combatant.portraitPath}
                color={combatant.color}
                size={34}
                onClick={openDetails}
                sx={{ ...avatarBaseSx, cursor: 'pointer' }}
              >
                <Avatar sx={{ ...avatarBaseSx, bgcolor: 'transparent' }}>PC</Avatar>
              </PortraitBadge>
            )}
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Stack direction="row" spacing={0.75} sx={{ minWidth: 0, alignItems: 'center' }}>
                {combatant.shape ? (
                  <Typography sx={{ color: combatant.shapeClr, fontWeight: FONT_WEIGHTS.heavy, flexShrink: 0 }}>
                    {combatant.shape}{combatant.label}
                  </Typography>
                ) : null}
                {isMonster && combatant.monsterData ? (
                  <Button size="small" onClick={openDetails} sx={nameButtonSx}>
                    <Box component="span" sx={nameSpanSx}>{combatant.name}</Box>
                  </Button>
                ) : !isMonster ? (
                  <Button size="small" onClick={openDetails} sx={nameButtonSx}>
                    <Box component="span" sx={nameSpanSx}>{combatant.name}</Box>
                  </Button>
                ) : (
                  <Typography noWrap sx={{ fontWeight: FONT_WEIGHTS.heavy }}>{combatant.name}</Typography>
                )}
                {!isMonster && combatant.sourceId ? (
                  <Tooltip title="Open sheet">
                    <IconButton
                      component="a"
                      href={campaignSheetUrl(combatant.sourceId, { edit: true })}
                      target="_blank"
                      rel="noopener"
                      size="small"
                      sx={sheetLinkButtonSx}
                      aria-label={`Open ${combatant.name} sheet`}
                    >
                      <ExternalLink size={ICON_SIZES.xs} />
                    </IconButton>
                  </Tooltip>
                ) : null}
              </Stack>
              {/* AC only: the initiative modifier lived here too, but the rolled
                  initiative is already the field on the left, so the modifier
                  was noise competing with the one stat read every turn. */}
              <Tooltip title="Armor Class">
                <Box sx={acBadgeSx}>
                  <Shield size={ICON_SIZES.xs} />
                  <Box component="span" sx={acLabelSx}>AC</Box>
                  <Box component="span" sx={acValueSx}>{combatant.ac}</Box>
                </Box>
              </Tooltip>
            </Box>
          </Stack>
        </Box>

        {/* HP panel: value + [amount] − stepper per row (mirrors the sheet HP block) */}
        <Box sx={hpRowSx}>
          {isDown ? (
            <Box sx={hpPanelRowSx}>
              <DeathSaves combatant={combatant} />
              <HpStepper
                amount={hpAmt}
                onAmount={setHpAmt}
                onPlus={(n) => dispatch({ type: 'modifyHp', id: combatant.id, delta: n })}
                onMinus={(n) => dispatch({ type: 'modifyHp', id: combatant.id, delta: -n })}
                plusColor="success.main"
                minusColor="error.main"
                plusLabel="Heal"
                minusLabel="Damage"
              />
            </Box>
          ) : (
            <>
              {/* Current / Max + heal / damage */}
              <Box sx={hpPanelRowSx}>
                <Box sx={hpValueRowSx}>
                  <HpField
                    label="HP"
                    value={combatant.hpCurrent}
                    onChange={(value) => dispatch({ type: 'setHp', id: combatant.id, value })}
                  />
                  <Typography sx={[{ color: 'text.secondary' }, hpMaxSx]}>/</Typography>
                  <HpField
                    label="Max"
                    value={combatant.hpMax}
                    onChange={(value) => dispatch({ type: 'setMaxHp', id: combatant.id, value })}
                  />
                </Box>
                <HpStepper
                  amount={hpAmt}
                  onAmount={setHpAmt}
                  onPlus={(n) => dispatch({ type: 'modifyHp', id: combatant.id, delta: n })}
                  onMinus={(n) => dispatch({ type: 'modifyHp', id: combatant.id, delta: -n })}
                  plusColor="success.main"
                  minusColor="error.main"
                  plusLabel="Heal"
                  minusLabel="Damage"
                />
              </Box>

              {/* Disclosure row: the toggle stays put and the collapsed flags
                  sit exactly where their full rows expand, so opening the
                  section reads as the flags unfolding rather than as new
                  content appearing elsewhere. */}
              <Box sx={hpSummaryRowSx}>
                <Button
                  size="small"
                  onClick={() => setHpDetailsOpen((open) => !open)}
                  aria-expanded={hpDetailsOpen}
                  startIcon={hpDetailsOpen ? <ChevronUp size={ICON_SIZES.sm} /> : <ChevronDown size={ICON_SIZES.sm} />}
                  sx={hpToggleSx}
                >
                  HP modifiers
                </Button>
                {!hpDetailsOpen && tempHp !== 0 ? (
                  <HpFlag Icon={Sparkles} title={`Temp HP: ${tempHp}`} text={tempHp} />
                ) : null}
                {!hpDetailsOpen && maxHpBonus !== 0 ? (
                  <HpFlag Icon={HeartPulse} title={`Max HP modifier: ${maxHpBonusText}`} text={maxHpBonusText} />
                ) : null}
              </Box>

              <Collapse in={hpDetailsOpen} unmountOnExit sx={collapseSx}>
                <Box sx={hpDetailsSx}>
                  {/* Temp HP */}
                  <Box sx={hpPanelRowSx}>
                    <HpField
                      label="Temp"
                      value={combatant.tempHP ?? 0}
                      onChange={(value) => dispatch({ type: 'setTempHp', id: combatant.id, value })}
                    />
                    <HpStepper
                      amount={tempAmt}
                      onAmount={setTempAmt}
                      onPlus={(n) => dispatch({ type: 'modifyTempHp', id: combatant.id, delta: n })}
                      onMinus={(n) => dispatch({ type: 'modifyTempHp', id: combatant.id, delta: -n })}
                      plusLabel="Add temp HP"
                      minusLabel="Remove temp HP"
                    />
                  </Box>

                  {/* Max HP modifier (delta over base max; works for PCs and monsters) */}
                  <Box sx={hpPanelRowSx}>
                    <HpField
                      label="Max mod"
                      value={combatant.maxHPBonus ?? 0}
                      onChange={(value) => {
                        dispatch({ type: 'setMaxHpBonus', id: combatant.id, value: Number(value) || 0 });
                      }}
                    />
                    <HpStepper
                      amount={modAmt}
                      onAmount={setModAmt}
                      onPlus={(n) => dispatch({ type: 'modifyMaxHp', id: combatant.id, delta: n })}
                      onMinus={(n) => dispatch({ type: 'modifyMaxHp', id: combatant.id, delta: -n })}
                      plusLabel="Increase max HP"
                      minusLabel="Decrease max HP"
                    />
                  </Box>
                </Box>
              </Collapse>

              <LinearProgress
                variant="determinate"
                value={hpPct}
                sx={{ ...hpBarSx, '& .MuiLinearProgress-bar': { bgcolor: hpToneColor(hpPct, 100, HP_TONE_COLORS) } }}
              />
            </>
          )}
        </Box>

        {/* Full width under both columns: condition and effect pills are read
            while scanning the initiative order, so they must not compete with
            the identity or HP clusters for horizontal space. Effects sit below
            conditions rather than beside them — they are the shorter-lived and
            more numerous of the two, and only they carry ADV/DIS colouring. */}
        <Box sx={conditionsRowSx}>
          <CombatantConditions combatant={combatant} />
        </Box>
        <Box sx={effectsRowSx}>
          <CombatantReminders combatant={combatant} />
        </Box>
      </Box>
    </Paper>
  );
}

function HpField({ label, value, onChange }) {
  return (
    <TextField
      size="small"
      label={label}
      type="number"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onFocus={selectInputText}
      sx={hpFieldSx}
    />
  );
}

// Collapsed-state marker for a value hidden inside the HP details: same icons
// the sheet's HP block uses for Temp / Max mod, so the two surfaces read alike.
function HpFlag({ Icon, title, text }) {
  return (
    <Tooltip title={title}>
      <Box sx={hpFlagSx}>
        <Icon size={ICON_SIZES.xxs} />
        <Box component="b">{text}</Box>
      </Box>
    </Tooltip>
  );
}

function DeathSaves({ combatant }) {
  const { dispatch } = useEncounterBuilder();
  return (
    <DeathSaveDots
      deathSaves={combatant.deathSaves}
      size={16}
      shortLabels
      gap={1.5}
      onChange={(saveType, value) => dispatch({ type: 'setDeathSave', id: combatant.id, saveType, value })}
    />
  );
}


function selectInputText(event) {
  event.target.select();
}

