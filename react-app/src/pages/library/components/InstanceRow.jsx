import { Box, Typography, CircularProgress } from '@mui/material';
import { Link } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import * as s from '../styles.js';
import { UI_COLORS } from '../../../shared/ui/colors.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import TagChip from '../../../shared/ui/TagChip.jsx';

// Shared row for every instance picker: generic tool lists render it with a
// plain `to` link, the characters picker renders it with an async `onOpen`
// (cloud-freshness check) plus an origin badge and optional GM subtitle.
export default function InstanceRow({
  name, updatedAtLabel, to, onOpen, onRename, onDelete, opening, badge, subtitle, extraAction,
}) {
  // The open control is a native <button> (via `component="button"`), whose
  // content model only allows phrasing content: every child here renders as
  // a span, never a div/p, so nothing here is a block element.
  const inner = (
    <>
      <Box component="span" sx={{ minWidth: 0, flex: 1, display: 'block' }}>
        <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Typography component="span" sx={s.nameSx}>{name}</Typography>
          {badge ? <TagChip component="span" label={badge.label} tone={badge.kind === 'cloud' ? UI_COLORS.infoText : UI_COLORS.textSecondary} /> : null}
        </Box>
        {subtitle ? <Typography component="span" sx={{ ...s.subtitleSx, display: 'block' }}>{subtitle}</Typography> : null}
      </Box>
      {opening ? (
        <CircularProgress size={12} sx={{ color: UI_COLORS.accent, flexShrink: 0 }} />
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
            <Pencil size={ICON_SIZES.sm} strokeWidth={1.7} />
          </Box>
        ) : null}
        {onDelete ? (
          <Box component="button" type="button" onClick={onDelete} sx={s.deleteBtnSx} aria-label={`Delete ${name}`} title="Delete">
            <Trash2 size={ICON_SIZES.sm} strokeWidth={1.7} />
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}
