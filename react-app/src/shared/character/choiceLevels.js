const _maps = [];

export function registerChoiceLevelMap(config) {
  if (!config || typeof config.test !== 'function' || typeof config.level !== 'function') return;
  _maps.push({ test: config.test, level: config.level, source: config.source || '' });
}

export function getChoiceLevel(choiceKey) {
  if (!choiceKey) return null;
  for (var i = 0; i < _maps.length; i++) {
    try {
      var result = _maps[i].test(choiceKey);
      if (result) {
        var level = _maps[i].level(result);
        if (level != null && Number.isFinite(Number(level))) return Number(level);
      }
    } catch (e) {
      continue;
    }
  }
  return null;
}

export function clearChoiceLevelMaps() {
  _maps.length = 0;
}
