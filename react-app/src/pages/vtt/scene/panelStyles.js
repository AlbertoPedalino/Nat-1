import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';

// Small styles shared by the scene's panels (number fields, pill labels,
// colour inputs).

export const numberSx = { width: 92 };

export const pillLabelSx = {
  ml: 0.5,
  ...TEXT_STYLES.title,
  fontSize: FONT_SIZES.xs,
  
};

