// Scimitar of Speed (XDMG): while attuned, you can make one attack with it as a
// Bonus Action on each of your turns. The +2 to attack/damage already flows
// through item enhancement (bonusWeapon) once attuned; here we add the extra
// Bonus Action attack card. The base attack card comes from the equipped weapon
// as usual, so this only registers the bonus clone.

function normName(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export default function install(registry) {
  registry.registerWeaponExtraAttack({
    key: 'scimitar-of-speed',
    match: (item) => normName(item?.name) === 'scimitarofspeed' && !!item?.attuned,
    cat: 'bonus',
    uses: 'Bonus Action (Scimitar of Speed)',
  });
}
