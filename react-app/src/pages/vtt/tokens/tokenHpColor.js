import { hpTone } from '../../../shared/character/combat/vitals.js';
import { VTT_COLORS } from '../../../shared/vtt/colors.js';

// Green while healthy, amber past half, red when bloodied enough to matter.
const HP_TONE_COLORS = { healthy: VTT_COLORS.hpHealthy, wounded: VTT_COLORS.hpWounded, critical: VTT_COLORS.hpCritical };

export function hpColor(ratio) {
  return HP_TONE_COLORS[hpTone(ratio, 1)];
}
