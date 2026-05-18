import { Fragment, useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { getRollTable, rollTable } from '../../../shared/character/rollTables.js';

function getClassLevel(C, className) {
  if (!C || !className) return Number(C?.level || 0);
  const target = String(className).toLowerCase();
  let lv = 0;
  if (String(C?.className || '').toLowerCase() === target) lv += Number(C?.classLevel || C?.level || 0);
  (C?.extraClasses || []).forEach((ec) => {
    if (String(ec?.name || '').toLowerCase() === target) lv += Number(ec?.level || 0);
  });
  return lv || Number(C?.level || 0);
}

function FeatureBox({ title, accent, children }) {
  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1.2 }}>
      <Typography sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.68rem', fontWeight: 700, color: accent || '#edd48a', letterSpacing: '0.08em', mb: 0.4 }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

function renderSafeInlineBody(value) {
  const nodes = [];
  let bold = false;
  String(value || '').split(/(<br\s*\/?>|<\/?b>)/gi).forEach((part, index) => {
    if (!part) return;
    const token = part.toLowerCase();
    if (/^<br\s*\/?>$/.test(token)) {
      nodes.push(<br key={`br-${index}`} />);
      return;
    }
    if (token === '<b>') {
      bold = true;
      return;
    }
    if (token === '</b>') {
      bold = false;
      return;
    }
    nodes.push(bold ? (
      <Box key={`b-${index}`} component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>
        {part}
      </Box>
    ) : (
      <Fragment key={`t-${index}`}>{part}</Fragment>
    ));
  });
  return nodes;
}

function SectionBody({ html, accent }) {
  return (
    <Typography
      sx={{ fontSize: '0.68rem', color: accent || 'text.secondary', lineHeight: 1.5 }}
    >
      {renderSafeInlineBody(html)}
    </Typography>
  );
}

export default function ActionDetailPanel({ action, character, sheet, onShowToast }) {
  const [result, setResult] = useState(null);
  const detail = action?.detail || {};
  const charLevel = detail.levelClass
    ? getClassLevel(character, detail.levelClass)
    : Number(character?.level || 0);
  const sections = (detail.sections || []).filter((s) => !s.minLevel || charLevel >= Number(s.minLevel));
  const roll = detail.roll || null;
  const tableMeta = roll?.tableKey ? getRollTable(roll.tableKey) : null;
  const dual = Boolean(roll?.dualRollFromLevel != null && charLevel >= Number(roll.dualRollFromLevel));

  const doRoll = (e) => {
    e?.stopPropagation?.();
    if (!roll || !tableMeta) return;
    const count = dual ? 2 : 1;
    const out = rollTable(roll.tableKey, { count });
    if (!out) return;
    setResult({ ...out, dual });
    const toastLines = out.rolls.map((r, i) =>
      `${dual ? `#${i + 1} ` : ''}[${r.range}] ${r.effect}`).join('\n');
    onShowToast?.(
      tableMeta.name,
      dual ? `${toastLines}\nChoose one.` : toastLines,
      dual ? 0 : out.rolls[0].value,
      out.rolls.map((r) => ({ v: r.value, faces: r.faces })),
    );
  };

  return (
    <Box
      onClick={(e) => e.stopPropagation()}
      sx={{ mt: 0.8, p: 1, bgcolor: 'rgba(237,212,138,0.04)', border: 1, borderColor: 'divider', borderRadius: 1 }}
    >
      <Stack spacing={1.2}>
        {sections.map((s, i) => (
          <FeatureBox key={`sec-${i}`} title={s.title} accent={s.accent}>
            <SectionBody html={s.body} accent={s.accent} />
          </FeatureBox>
        ))}
        {roll && tableMeta ? (
          <FeatureBox title={roll.title || `Roll ${tableMeta.name}`}>
            {roll.subtitle ? (
              <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary', mb: 0.5 }}>
                {roll.subtitle}
              </Typography>
            ) : null}
            <Button
              size="small"
              variant="outlined"
              onClick={doRoll}
              sx={{ fontSize: '0.6rem', fontFamily: '"Cinzel", Georgia, serif', letterSpacing: '0.06em' }}
            >
              {dual ? (roll.dualLabel || 'Roll Two') : (roll.label || `Roll d${tableMeta.sides}`)}
            </Button>
            {dual && roll.dualNote ? (
              <Typography sx={{ mt: 0.3, fontSize: '0.6rem', color: '#70b7a6', fontStyle: 'italic' }}>
                {roll.dualNote}
              </Typography>
            ) : null}
            {result ? (
              <Box sx={{ mt: 0.4, p: 0.6, bgcolor: 'rgba(237,212,138,0.06)', borderRadius: 1 }}>
                {result.dual ? (
                  <>
                    <Typography sx={{ fontSize: '0.65rem', color: '#edd48a', fontWeight: 700, mb: 0.3 }}>
                      Choose one:
                    </Typography>
                    {result.rolls.map((r, i) => (
                      <Typography key={`d-${i}`} sx={{ fontSize: '0.62rem', color: 'text.secondary', mb: 0.2 }}>
                        #{i + 1} [{r.range}] {r.effect}
                      </Typography>
                    ))}
                  </>
                ) : (
                  <>
                    <Typography sx={{ fontSize: '0.65rem', color: '#edd48a', fontWeight: 700 }}>
                      d{tableMeta.sides}: {result.rolls[0].value}
                    </Typography>
                    <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary', mt: 0.2 }}>
                      [{result.rolls[0].range}] {result.rolls[0].effect}
                    </Typography>
                  </>
                )}
              </Box>
            ) : null}
            {roll.sourceLink ? (
              <Box sx={{ mt: 0.5 }}>
                <Typography
                  component="a"
                  href={roll.sourceLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  sx={{ fontSize: '0.55rem', color: '#4d95d6', textDecoration: 'underline', cursor: 'pointer' }}
                >
                  {roll.sourceLinkLabel || roll.sourceLink}
                </Typography>
              </Box>
            ) : null}
          </FeatureBox>
        ) : null}
      </Stack>
    </Box>
  );
}
