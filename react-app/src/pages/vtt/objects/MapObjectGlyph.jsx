import { CircleDashed } from 'lucide-react';
import { DynamicIcon } from 'lucide-react/dynamic';
import {
  DEFAULT_MAP_OBJECT_STROKE,
  GAME_DRAWING_PREFIX,
  normalizeMapObjectKey,
  normalizeMapObjectStroke,
} from '../../../shared/vtt/map/mapObjects.js';
import { MAP_OBJECT_DRAWINGS } from '../../../shared/ui/gameIcons.js';

export default function MapObjectGlyph({
  iconKey, size = '72%', strokeWidth = DEFAULT_MAP_OBJECT_STROKE,
}) {
  const name = normalizeMapObjectKey(iconKey);
  // A game drawing is filled, not stroked: it takes the colour, not the width.
  if (name?.startsWith(GAME_DRAWING_PREFIX)) {
    const Drawing = MAP_OBJECT_DRAWINGS[name.slice(GAME_DRAWING_PREFIX.length)] || CircleDashed;
    return <Drawing size={size} />;
  }
  return name ? (
    <DynamicIcon
      name={name}
      fallback={CircleDashed}
      width={size}
      height={size}
      strokeWidth={normalizeMapObjectStroke(strokeWidth)}
    />
  ) : null;
}
