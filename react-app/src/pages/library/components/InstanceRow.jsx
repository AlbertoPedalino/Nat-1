import { Box, Typography, Chip, CircularProgress, useTheme } from '@mui/material';
import { Link } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import * as s from '../styles.js';

// Shared row for every instance picker: generic tool lists render it with a
// plain `to` link, the characters picker renders it with an async `onOpen`
// (cloud-freshness check) plus an origin badge and optional GM subtitle.
export default function InstanceRow({
  name, updatedAtLabel, to, onOpen, onRename, onDelete, opening, badge, subtitle, extraAction,
}) {
  const theme = useTheme();
  // The open control is a native <button> (via `component="button"`), whose
  // content model only allows phrasing content: every child here renders as
  // a span, never a div/p, so nothing here is a block element.
  const inner = (
    <>
      <Box component="span" sx={{ minWidth: 0, flex: 1, display: 'block' }}>
        <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Typography component="span" sx={s.nameSx}>{name}</Typography>
          {badge ? <Chip component="span" size="small" label={badge.label} sx={s.badgeSx(badge.kind, theme)} /> : null}
        </Box>
        {subtitle ? <Typography component="span" sx={{ ...s.subtitleSx, display: 'block' }}>{subtitle}</Typography> : null}
      </Box>
      {opening ? (
        <CircularProgress size={12} sx={{ color: '#c8a84b', flexShrink: 0 }} />
      ) : (
        <Typography component="span" sx={s.metaSx}>{updatedAtLabel}</Typography>
      )}
    </>
  );

  return (
    <Box sx={s.rowSx}>
      {to ? (
        <Box component={Link} to={to} sx={s.rowInnerSx}>{inner}</Box>
      ) : (
        <Box
          component="button"
          type="button"
          onClick={onOpen}
          disabled={opening}
          sx={s.rowInnerSx}
        >
          {inner}
        </Box>
      )}
      <Box sx={s.actionsSx}>
        {extraAction ? (
          <Box
            component="button"
            type="button"
            onClick={extraAction.onClick}
            sx={s.iconBtnSx}
            aria-label={extraAction.label}
            title={extraAction.label}
          >
            <extraAction.icon size={14} strokeWidth={1.7} />
          </Box>
        ) : null}
        {onRename ? (
          <Box component="button" type="button" onClick={onRename} sx={s.iconBtnSx} aria-label={`Rename ${name}`} title="Rename">
            <Pencil size={14} strokeWidth={1.7} />
          </Box>
        ) : null}
        {onDelete ? (
          <Box component="button" type="button" onClick={onDelete} sx={s.deleteBtnSx} aria-label={`Delete ${name}`} title="Delete">
            <Trash2 size={14} strokeWidth={1.7} />
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}
