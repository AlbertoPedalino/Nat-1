import { useId } from 'react';
import { UI_COLORS } from './colors.js';

// A hand-drawn drawing's pieces (handDrawing.js) as an SVG: every role named
// in the palette's colour (in style: the roles are CSS variables), each group
// cut to its path, each blurred piece through a soft filter, each shaded fill
// (a `{ shade: [[offset, role], …] }` in place of a role: a metal's sheen, top
// to foot) through a gradient. What a panel's grip and banner are drawn with
// (PanelGrip.jsx, PanelBanner.jsx). It never takes a pointer. With no
// `pieces` yet (its box not measured), it is there unseen, for its `ref` to
// find the box by.

const META = new Set(['tag', 'fill', 'stroke', 'strokeWidth', 'opacity', 'blur', 'children', 'clip', 'crisp']);

function drawPiece(piece, key, scope) {
  if (piece.tag === 'g') {
    const clipId = piece.clip ? scope.clip(piece.clip) : null;
    return (
      <g
        key={key}
        transform={piece.transform}
        clipPath={clipId ? `url(#${clipId})` : undefined}
        shapeRendering={piece.crisp ? 'crispEdges' : undefined}
        style={piece.opacity === undefined ? undefined : { opacity: piece.opacity }}
      >
        {piece.children.map((child, i) => drawPiece(child, i, scope))}
      </g>
    );
  }
  const Tag = piece.tag;
  const geometry = Object.fromEntries(Object.entries(piece).filter(([name]) => !META.has(name)));
  return (
    <Tag
      key={key}
      {...geometry}
      strokeWidth={piece.strokeWidth || undefined}
      filter={piece.blur ? `url(#${scope.blur(piece.blur)})` : undefined}
      style={{ fill: scope.paint(piece.fill), stroke: scope.paint(piece.stroke), opacity: piece.opacity }}
    />
  );
}

export default function HandDrawnSvg({ pieces, box, style, ref }) {
  const prefix = `hd${useId().replace(/[^\w-]/g, '')}`;
  if (!pieces) return <svg ref={ref} aria-hidden="true" focusable="false" style={{ display: 'none' }} />;
  const clips = [];
  const blurs = new Map();
  const shades = new Map();
  const scope = {
    clip(d) {
      clips.push(d);
      return `${prefix}c${clips.length}`;
    },
    blur(amount) {
      if (!blurs.has(amount)) blurs.set(amount, `${prefix}b${blurs.size}`);
      return blurs.get(amount);
    },
    paint(fill) {
      if (!fill || fill === 'none') return 'none';
      if (typeof fill === 'string') return UI_COLORS[fill];
      const key = JSON.stringify(fill.shade);
      if (!shades.has(key)) shades.set(key, { id: `${prefix}g${shades.size}`, stops: fill.shade });
      return `url(#${shades.get(key).id})`;
    },
  };
  const drawn = pieces.map((piece, i) => drawPiece(piece, i, scope));
  return (
    <svg
      ref={ref}
      aria-hidden="true"
      focusable="false"
      width={box.width}
      height={box.height}
      viewBox={`${box.left} ${box.top} ${box.width} ${box.height}`}
      style={{ position: 'absolute', left: box.left, top: box.top, overflow: 'visible', pointerEvents: 'none', ...style }}
    >
      <defs>
        {clips.map((d, i) => <clipPath key={i} id={`${prefix}c${i + 1}`}><path d={d} /></clipPath>)}
        {[...blurs].map(([amount, id]) => (
          <filter key={id} id={id} x="-50%" y="-80%" width="200%" height="260%">
            <feGaussianBlur stdDeviation={amount} />
          </filter>
        ))}
        {[...shades.values()].map(({ id, stops }) => (
          <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
            {stops.map(([offset, role]) => <stop key={offset} offset={offset} style={{ stopColor: UI_COLORS[role] }} />)}
          </linearGradient>
        ))}
      </defs>
      {drawn}
    </svg>
  );
}
