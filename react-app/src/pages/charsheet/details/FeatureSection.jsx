import { useState } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import CollapsibleBody from '../../../shared/ui/CollapsibleBody.jsx';
import { EntryBlocks } from '../../../shared/content/EntryBlocks.jsx';
import { ENTITY_COLORS as SOURCE_COLOR } from '../../../shared/ui/entityColors.js';
import { UI_COLORS, uiAlpha, OPACITY } from '../../../shared/ui/colors.js';
import { FONT_SIZES, FONT_WEIGHTS } from '../../../shared/ui/fonts.js';
import { featureKey } from './featuresTabData.js';
import { sheetSectionHeaderSx } from '../../../shared/ui/PanelHeader.jsx';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { SURFACES } from '../../../shared/ui/surfaces.js';

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
          <Typography sx={{ ...TEXT_STYLES.label, fontSize: FONT_SIZES.xxs, color: UI_COLORS.accentText, borderBottom: 1, borderColor: uiAlpha(UI_COLORS.accentText, OPACITY.shade), pb: 0.25, mb: 0.25 }}>
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

function FeatureItem({ feature, tone }) {
  const [open, setOpen] = useState(false);
  const sourceKind = feature?.sourceKind || 'class';
  const isSubclass = sourceKind === 'subclass';
  const subclassTone = SOURCE_COLOR.subclass;
  const borderTone = isSubclass ? subclassTone : (tone || UI_COLORS.info);

  return (
    <Box
      className={open ? 'open' : ''}
      sx={{
        ...SURFACES.panel,
        borderLeft: `3px solid ${borderTone}`,
        mb: 0.25,
        overflow: 'hidden',
      }}
    >
      <Box onClick={() => setOpen(!open)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1.25,
          py: 0.75,
          cursor: 'pointer',
          '&:hover': { bgcolor: UI_COLORS.surfaceRaised },
        }}>
        <Typography sx={{ fontSize: FONT_SIZES.xl, color: 'text.primary', fontWeight: FONT_WEIGHTS.bold }}>{feature.name}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {feature.source && <Typography sx={{ ...TEXT_STYLES.note, fontSize: FONT_SIZES.xxs, color: isSubclass ? subclassTone : 'text.secondary' }}>{feature.source}</Typography>}
          {feature.level && <Chip size="small" label={`Lv ${feature.level}`} variant="outlined" sx={{ fontSize: FONT_SIZES.micro, height: 16, color: 'text.secondary' }} />}
        </Box>
      </Box>
      <CollapsibleBody open={open}>
        {feature.entries ? (
          <Box sx={{ px: 1.5, py: 1, borderTop: 1, borderColor: 'divider' }}>
            <EntryBlocks entries={feature.entries} emptyText="" />
          </Box>
        ) : null}
      </CollapsibleBody>
    </Box>
  );
}
