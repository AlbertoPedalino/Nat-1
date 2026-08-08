// One source of truth for VTT colours used outside MUI's simple theme-aware
// properties (canvas pixels, SVG attributes, gradients and compound shadows).
// Components should still prefer `gmboard.vtt.*` in `sx` when a theme token is
// enough; both APIs are backed by this palette.
export const VTT_COLORS = Object.freeze({
  black: '#000000',
  ink: '#0f0e0d',
  viewport: '#0b0a09',
  stitchBackground: '#12100e',
  surfaceRaised: '#1a1713',
  gold: '#e8c96a',
  goldSoft: '#edc36f',
  goldRoll: '#edd48a',
  goldHandle: '#f1d77d',
  goldPreview: '#f2df9d',
  goldBright: '#f4dda0',
  goldUiBright: '#f3df9c',
  parchment: '#f3ead6',
  parchmentMuted: '#e8dcc0',
  panelText: '#d9cfb8',
  panelTextSoft: '#cdbb83',
  panelTextMuted: '#b9ad91',
  panelTextFaint: '#9f947d',
  railText: '#b8a87a',
  rollDetail: '#8a7a5a',
  selectText: '#eadba9',
  selectSurface: '#161411',
  sheetSurface: '#0a0909',
  overlaySurface: '#050507',
  warning: '#d69245',
  error: '#de675f',
  danger: '#b3423a',
  dangerBright: '#df6b62',
  dangerDeep: '#8f2f34',
  success: '#4f8a5b',
  successBright: '#7bc78a',
  deathSuccess: '#4f9c62',
  hpHealthy: '#4f8a5b',
  hpWounded: '#c8973f',
  hpCritical: '#b3423a',
  tempHp: '#4f7fa8',
  tempHpText: '#dff0fb',
  drawingGuide: '#6fd1e8',
  drawingText: '#dff4fb',
  laser: '#ff5046',
  laserCore: '#ffebe6',
  laserText: '#ffd9d4',
  white: '#ffffff',
  deathText: '#f7e9dc',
  neutralMark: '#e2dac6',
  menuSuccess: '#70b78f',
  menuDanger: '#d76767',
  dungeon: '#7a5aa8',
  objectDefault: '#6f5b32',
  exploredHex: '#6f8f5a',
});

export function vttAlpha(color, alpha) {
  const match = /^#([0-9a-f]{6})$/i.exec(color || '');
  if (!match) return color;
  const value = Number.parseInt(match[1], 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red}, ${green}, ${blue}, ${Math.max(0, Math.min(1, Number(alpha)))})`;
}
