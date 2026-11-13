import { useLayoutEffect, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { ONE_LINE_SX } from './textStyles.js';

// How fast a name too long for its card slides to its end and back (px/s),
// and the shortest slide (ms): a name a few letters over still moves slowly
// enough to read. It rests at each end as long as it takes to slide.
const SCROLL_SPEED = 30;
const MIN_SLIDE_MS = 1200;

// A card's name on one line (an action, a spell, an item). Where it fits it
// stands still; where the card cuts it, it slides to its end, rests, and comes
// back, so the whole name can be read. `sx` styles the name as a Typography.
export default function ScrollingName({ children, sx }) {
  const ref = useRef(null);
  const [overflow, setOverflow] = useState(0);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const measure = () => {
      const next = Math.max(0, Math.ceil(element.scrollWidth - element.clientWidth));
      setOverflow((prev) => (Math.abs(prev - next) > 1 ? next : prev));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [children]);

  if (!overflow) {
    return <Typography ref={ref} sx={{ ...ONE_LINE_SX, ...sx }}>{children}</Typography>;
  }
  const slideMs = Math.max(MIN_SLIDE_MS, (overflow / SCROLL_SPEED) * 1000);
  return (
    <Typography ref={ref} sx={{ ...ONE_LINE_SX, textOverflow: 'clip', ...sx }}>
      <Box component="span" sx={{ ...nameSlideSx, '--gb-name-shift': `${-overflow}px`, animationDuration: `${slideMs * 4}ms` }}>
        {children}
      </Box>
    </Typography>
  );
}

const nameSlideSx = {
  display: 'inline-block',
  animationName: 'gbNameSlide',
  animationTimingFunction: 'ease-in-out',
  animationIterationCount: 'infinite',
  '@keyframes gbNameSlide': {
    '0%, 25%': { transform: 'translateX(0)' },
    '50%, 75%': { transform: 'translateX(var(--gb-name-shift))' },
    '100%': { transform: 'translateX(0)' },
  },
  '@media (prefers-reduced-motion: reduce)': { animationName: 'none' },
};
