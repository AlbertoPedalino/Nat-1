import { VTT_COLORS, vttAlpha } from '../../../../shared/vtt/colors.js';

export function atmosphereFallbackSx(config) {
  const alpha = Math.max(0.08, config.intensity * 0.32);
  const common = { opacity: config.intensity, mixBlendMode: 'screen' };
  if (config.type === 'fog') {
    return {
      ...common,
      background: `radial-gradient(ellipse at 30% 70%, ${vttAlpha(VTT_COLORS.white, 0.6)}, transparent 55%), linear-gradient(${vttAlpha(VTT_COLORS.panelTextMuted, 0.25)}, ${vttAlpha(VTT_COLORS.neutralMark, 0.45)})`,
    };
  }
  if (config.type === 'wind') {
    return {
      ...common,
      mixBlendMode: 'normal',
      background: `repeating-linear-gradient(0deg, transparent 0 18px, ${vttAlpha(VTT_COLORS.drawingGuide, 0.34)} 20px 23px, transparent 26px 54px)`,
    };
  }
  if (config.type === 'sandstorm') {
    return {
      ...common,
      background: `linear-gradient(115deg, ${vttAlpha(VTT_COLORS.objectDefault, 0.35)}, ${vttAlpha(VTT_COLORS.warning, 0.55)}, ${vttAlpha(VTT_COLORS.objectDefault, 0.3)})`,
    };
  }
  if (config.type === 'blizzard') {
    return {
      ...common,
      background: `repeating-linear-gradient(110deg, ${vttAlpha(VTT_COLORS.white, 0.1)} 0 7px, ${vttAlpha(VTT_COLORS.drawingText, 0.45)} 8px 10px, transparent 11px 25px)`,
    };
  }
  if (config.type === 'snow') {
    return {
      ...common,
      background: `radial-gradient(circle at 18% 24%, ${vttAlpha(VTT_COLORS.white, 0.8)} 0 2px, transparent 3px), radial-gradient(circle at 72% 58%, ${vttAlpha(VTT_COLORS.drawingText, 0.68)} 0 3px, transparent 4px), linear-gradient(${vttAlpha(VTT_COLORS.white, 0.12)}, ${vttAlpha(VTT_COLORS.drawingText, 0.2)})`,
      backgroundSize: '53px 47px, 79px 71px, auto',
    };
  }
  if (config.type === 'fire') {
    return {
      ...common,
      background: `radial-gradient(ellipse at 18% 108%, ${vttAlpha(VTT_COLORS.warning, 0.9)}, transparent 45%), radial-gradient(ellipse at 62% 112%, ${vttAlpha(VTT_COLORS.objectDefault, 0.8)}, transparent 50%), linear-gradient(to top, ${vttAlpha(VTT_COLORS.warning, 0.42)}, transparent 58%)`,
    };
  }
  if (config.type === 'sunrays') {
    return {
      ...common,
      background: `repeating-linear-gradient(122deg, transparent 0 11%, ${vttAlpha(VTT_COLORS.warning, 0.28)} 18% 25%, transparent 33% 46%), radial-gradient(ellipse at 18% 0%, ${vttAlpha(VTT_COLORS.white, 0.32)}, transparent 68%)`,
    };
  }
  if (config.type === 'swamp') {
    return {
      ...common,
      mixBlendMode: 'normal',
      background: `radial-gradient(ellipse at 22% 88%, ${vttAlpha(VTT_COLORS.successBright, 0.42)}, transparent 42%), radial-gradient(ellipse at 78% 72%, ${vttAlpha(VTT_COLORS.exploredHex, 0.48)}, transparent 48%), linear-gradient(to top, ${vttAlpha(VTT_COLORS.ink, 0.58)}, ${vttAlpha(VTT_COLORS.success, 0.24)} 68%, transparent)`,
    };
  }
  if (config.type === 'haunted') {
    return {
      ...common,
      mixBlendMode: 'normal',
      background: `radial-gradient(ellipse at center, transparent 42%, ${vttAlpha(VTT_COLORS.drawingGuide, 0.14)} 72%, ${vttAlpha(VTT_COLORS.overlaySurface, 0.76)} 100%)`,
    };
  }
  if (config.type === 'goldvault') {
    return {
      ...common,
      background: `radial-gradient(ellipse at 50% 108%, ${vttAlpha(VTT_COLORS.goldBright, 0.92)}, transparent 62%), radial-gradient(circle at 18% 72%, ${vttAlpha(VTT_COLORS.white, 0.58)} 0 1px, transparent 3px), radial-gradient(circle at 81% 36%, ${vttAlpha(VTT_COLORS.goldRoll, 0.78)} 0 2px, transparent 4px), ${vttAlpha(VTT_COLORS.gold, 0.08)}`,
      backgroundSize: 'auto, 83px 71px, 127px 109px',
    };
  }
  return {
    ...common,
    mixBlendMode: 'normal',
    background: `repeating-linear-gradient(105deg, ${vttAlpha(VTT_COLORS.drawingGuide, alpha)} 0 1px, transparent 2px 16px), ${vttAlpha(VTT_COLORS.surfaceRaised, config.type === 'storm' ? alpha : alpha * 0.35)}`,
  };
}
