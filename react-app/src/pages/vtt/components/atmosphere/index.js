import blizzard from './blizzard.js';
import fire from './fire.js';
import fog from './fog.js';
import goldvault from './goldvault.js';
import haunted from './haunted.js';
import rain from './rain.js';
import sandstorm from './sandstorm.js';
import snow from './snow.js';
import storm from './storm.js';
import sunrays from './sunrays.js';
import swamp from './swamp.js';
import wind from './wind.js';

const ATMOSPHERE_SHADERS = Object.freeze({
  rain,
  storm,
  wind,
  fog,
  blizzard,
  sandstorm,
  snow,
  fire,
  sunrays,
  swamp,
  haunted,
  goldvault,
});

export function getAtmosphereFragmentShader(type) {
  return ATMOSPHERE_SHADERS[type] || null;
}
