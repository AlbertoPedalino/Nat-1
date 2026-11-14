import { Link } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import { UI_COLORS } from '../../../shared/ui/colors.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import TagChip from '../../../shared/ui/TagChip.jsx';
import EntityRow from '../../../shared/ui/EntityRow.jsx';
import TipIconButton from '../../../shared/ui/TipIconButton.jsx';
import BusyDie from '../../../shared/ui/BusyDie.jsx';

// Shared row for every instance picker: generic tool lists render it with a
// plain `to` link, the characters picker renders it with an async `onOpen`
// (cloud-freshness check) plus an origin badge and optional GM subtitle.
export default function InstanceRow({
  name, updatedAtLabel, to, onOpen, onRename, onDelete, opening, badge, subtitle, extraAction,
}) {
  const openProps = to ? { component: Link, to } : { onClick: onOpen, disabled: opening };
  const hasActions = Boolean(extraAction || onRename || onDelete);
  return (
    <EntityRow
      surface="card"
      {...openProps}
      title={name}
      badge={badge ? (
        <TagChip component="span" label={badge.label} tone={badge.kind === 'cloud' ? UI_COLORS.infoText : UI_COLORS.textSecondary} />
      ) : null}
      subtitle={subtitle}
      meta={opening ? <BusyDie size={12} /> : updatedAtLabel}
      actions={hasActions ? (
        <>
          {extraAction ? (
            <TipIconButton size="small" title={extraAction.label} onClick={extraAction.onClick}>
              <extraAction.icon size={ICON_SIZES.sm} />
            </TipIconButton>
          ) : null}
          {onRename ? (
            <TipIconButton size="small" title="Rename" ariaLabel={`Rename ${name}`} onClick={onRename}>
              <Pencil size={ICON_SIZES.sm} />
            </TipIconButton>
          ) : null}
          {onDelete ? (
            <TipIconButton danger size="small" title="Delete" ariaLabel={`Delete ${name}`} onClick={onDelete}>
              <Trash2 size={ICON_SIZES.sm} />
            </TipIconButton>
          ) : null}
        </>
      ) : null}
    />
  );
}
