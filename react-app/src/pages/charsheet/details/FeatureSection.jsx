import { Box, Typography } from '@mui/material';
import { EntryAccordion } from '../../../shared/content/EntryAccordion.jsx';
import { ENTITY_COLORS as SOURCE_COLOR } from '../../../shared/ui/entityColors.js';
import { UI_COLORS, uiAlpha, OPACITY } from '../../../shared/ui/colors.js';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { featureKey } from './featuresTabData.js';
import { sheetSectionHeaderSx } from '../../../shared/ui/PanelHeader.jsx';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import MiniBadge from '../../../shared/ui/MiniBadge.jsx';

// A titled group of features on the Features tab, each expandable.

export function FeatureSection({ title, color, features }) {
  if (!features?.length) return null;

  const groups = {};
  features.forEach((feature) => {
    const lv = feature.level == null ? 0 : Number(feature.level || 1);
    if (!groups[lv]) groups[lv] = [];
    groups[lv].push(feature);
  });

  return (
    <Box sx={{ mb: 1 }}>
      <Typography sx={{ ...sheetSectionHeaderSx({ color, rule: uiAlpha(UI_COLORS.info, OPACITY.fill) }), pb: 0.25, mb: 0.5 }}>
        {title}
      </Typography>
      {Object.entries(groups).sort(([a], [b]) => Number(a) - Number(b)).map(([lv, feats]) => (
        <Box key={`${title}-${lv}`} sx={{ mb: 0.75 }}>
          <Typography sx={{ ...sheetSectionHeaderSx({ color: UI_COLORS.accentText, rule: uiAlpha(UI_COLORS.accentText, OPACITY.shade) }), fontSize: FONT_SIZES.xxs, pb: 0.25, mb: 0.25 }}>
            {Number(lv) === 0 ? 'General' : `Level ${lv}`}
          </Typography>
          {feats.map((feature, index) => (
            <FeatureItem key={`${featureKey(feature)}-${index}`} feature={feature} tone={color} />
          ))}
        </Box>
      ))}
    </Box>
  );
}

// A feature on the Features tab: the shared entry card (EntryAccordion), as
// in the builder's preview, its source and level on its right.
function FeatureItem({ feature, tone }) {
  const isSubclass = (feature?.sourceKind || 'class') === 'subclass';
  const kindTone = isSubclass ? SOURCE_COLOR.subclass : (tone || UI_COLORS.info);
  const trailing = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0, mr: 0.5 }}>
      {feature.source ? <Typography sx={{ ...TEXT_STYLES.note, fontSize: FONT_SIZES.xxs, color: isSubclass ? SOURCE_COLOR.subclass : 'text.secondary' }}>{feature.source}</Typography> : null}
      {feature.level ? <MiniBadge label={`Lv ${feature.level}`} color={UI_COLORS.textSecondary} /> : null}
    </Box>
  );
  return <EntryAccordion title={feature.name} tone={kindTone} entries={feature.entries || []} trailing={trailing} />;
}
