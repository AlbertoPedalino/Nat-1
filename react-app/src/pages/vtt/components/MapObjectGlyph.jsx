import { CircleDashed } from 'lucide-react';
import { DynamicIcon } from 'lucide-react/dynamic';
import {
  DEFAULT_MAP_OBJECT_STROKE,
  normalizeMapObjectKey,
  normalizeMapObjectStroke,
} from '../../../shared/vtt/mapObjects.js';

export default function MapObjectGlyph({
  iconKey, size = '72%', strokeWidth = DEFAULT_MAP_OBJECT_STROKE,
}) {
  const name = normalizeMapObjectKey(iconKey);
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
