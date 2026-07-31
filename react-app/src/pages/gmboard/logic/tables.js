export function getEvent(tables, sum) {
  return tables.events.find((e) => e.r === sum) || { name: '—', type: 'nothing' };
}

export function getLoot(tables, sum) {
  return tables.loot.find((e) => e.r === sum) || { tipo: 'Nothing found', rarita: '—', qualita: '—', valore: '—', extra: '' };
}

export function getCompl(tables, sum) {
  return tables.compl.find((e) => e.r === sum) || { type: 'None' };
}

export function getEnc(tables, tier, sum) {
  return (tables.enc[tier - 1] || []).find((e) => e.r === sum) || { diff: 'Low', lv: '?', xp: 0 };
}

export function getTrap(tables, tier, sum) {
  return (tables.trap[tier - 1] || []).find((e) => e.r === sum) || { tipo: 'Nuisance', lv: '?', dc: 10, danno: '?' };
}

export function getEnvSev(tables, sum) {
  return tables.env.find((e) => e.r === sum) || { gravita: 'Common' };
}
