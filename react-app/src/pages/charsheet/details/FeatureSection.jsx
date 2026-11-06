import { useState } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import CollapsibleBody from '../../../shared/ui/CollapsibleBody.jsx';
import { EntryBlocks } from '../../../shared/content/EntryBlocks.jsx';
import { ENTITY_COLORS as SOURCE_COLOR } from '../../../shared/ui/entityColors.js';
import { UI_COLORS, uiAlpha } from '../../../shared/ui/colors.js';
import { UI_FONTS } from '../../../shared/ui/fonts.js';
import { featureKey } from './featuresTabData.js';

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
      <Typography sx={{ fontFamily: UI_FONTS.display, fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color, borderBottom: 1, borderColor: uiAlpha(UI_COLORS.blue, 0.14), pb: 0.25, mb: 0.4 }}>
        {title}
      </Typography>
      {Object.entries(groups).sort(([a], [b]) => Number(a) - Number(b)).map(([lv, feats]) => (
        <Box key={`${title}-${lv}`} sx={{ mb: 0.75 }}>
          <Typography sx={{ fontFamily: UI_FONTS.display, fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: UI_COLORS.goldLight, borderBottom: 1, borderColor: uiAlpha(UI_COLORS.goldLight, 0.2), pb: 0.25, mb: 0.35 }}>
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
  const borderTone = isSubclass ? subclassTone : (tone || UI_COLORS.blue);

  return (
    <Box
      className={open ? 'open' : ''}
      sx={{
        bgcolor: UI_COLORS.headerBg,
        border: 1,
        borderColor: 'divider',
        borderLeft: `3px solid ${borderTone}`,
        borderRadius: 1,
        mb: 0.25,
        overflow: 'hidden',
      }}
    >
      <Box onClick={() => setOpen(!open)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: '9px',
          py: '6px',
          cursor: 'pointer',
          '&:hover': { bgcolor: UI_COLORS.surfaceRaised },
        }}>
        <Typography sx={{ fontSize: '0.8125rem', color: 'text.primary', fontWeight: 600 }}>{feature.name}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {feature.source && <Typography sx={{ fontSize: '0.56rem', color: isSubclass ? subclassTone : 'text.secondary', fontStyle: 'italic' }}>{feature.source}</Typography>}
          {feature.level && <Chip size="small" label={`Lv ${feature.level}`} variant="outlined" sx={{ fontSize: '0.44rem', height: 16, color: 'text.secondary' }} />}
        </Box>
      </Box>
      <CollapsibleBody open={open}>
        {feature.entries ? (
          <Box sx={{ px: '12px', py: '8px', borderTop: 1, borderColor: 'divider' }}>
            <EntryBlocks entries={feature.entries} emptyText="" />
          </Box>
        ) : null}
      </CollapsibleBody>
    </Box>
  );
}
