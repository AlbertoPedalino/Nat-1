import { CLASS_ICONS, FALLBACK_CLASS_ICON } from '../../ui/gameIcons.js';

// One source of truth for the class mark shown on the sheet and everywhere a
// character needs a portrait fallback.
export function classIcon(className) {
  return CLASS_ICONS[String(className || '').trim().toLowerCase()] || FALLBACK_CLASS_ICON;
}
