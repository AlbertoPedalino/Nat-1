import TagChip from './TagChip.jsx';
import { UI_COLORS } from './colors.js';

// How many of the allowed picks are taken ("1/1", "Cantrips 2/3"): a sticker
// that is neutral while picks are left, filled in the accent once the choice
// is complete and in danger when there are more than allowed. Every count of
// a choice in the builder (a choice's frame, a list of feats or options, the
// spell panel) is this one, so a finished choice reads the same everywhere.
// `prefix` names what is counted; `label` replaces the whole text when the
// count says more ("2/3 known").
export default function PickCount({ count, max, prefix = '', label = null, size = 'small' }) {
  if (!Number.isFinite(max) || max <= 0) return null;
  const over = count > max;
  const full = count === max;
  const text = label || `${prefix ? `${prefix} ` : ''}${count}/${max}`;
  const tone = over ? UI_COLORS.danger : (full ? UI_COLORS.accent : null);
  return <TagChip label={text} tone={tone} filled={over || full} size={size} />;
}
