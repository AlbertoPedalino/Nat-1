import { scanMarkup, tagDisplayText } from './inlineMarkup.js';

// 5etools inline markup reduced to the words it shows, read by the one markup
// parser (inlineMarkup.js): "{@item Shield|XPHB}" becomes "Shield",
// "{@hit 4}" "+4", "{@atkr m}" its stat-block label, a nested tag its shown
// text, plain {braces} their content. For labels, keys, search text and plain
// prose; the renderers that turn tags into rolls, links and styles build on
// the same parser (entryText.js, statBlockTags.js).
export function stripMarkup(value) {
  return scanMarkup(value).segments
    .map((segment) => (segment.type === 'text'
      ? segment.text.replace(/\{([^{}]+)\}/g, '$1')
      : tagDisplayText(segment.tag, segment.arg)))
    .join('')
    .replace(/\s+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}
