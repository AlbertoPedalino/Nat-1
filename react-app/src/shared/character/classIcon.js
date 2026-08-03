import {
  Axe,
  BookOpen,
  Compass,
  Cross,
  Dumbbell,
  Eye,
  Feather,
  Flame,
  Hammer,
  Music,
  Shield,
  Sparkles,
  Sword,
  Wand2,
} from 'lucide-react';

const CLASS_ICONS = {
  artificer: Hammer,
  barbarian: Axe,
  bard: Music,
  cleric: Cross,
  druid: Feather,
  fighter: Sword,
  monk: Dumbbell,
  paladin: Shield,
  ranger: Compass,
  rogue: Eye,
  sorcerer: Sparkles,
  warlock: Flame,
  wizard: BookOpen,
};

// One source of truth for the class mark shown on the sheet and everywhere a
// character needs a portrait fallback.
export function classIcon(className) {
  return CLASS_ICONS[String(className || '').trim().toLowerCase()] || Wand2;
}
