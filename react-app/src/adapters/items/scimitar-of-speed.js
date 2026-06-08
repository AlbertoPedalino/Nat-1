// The shared item activation policy handles equipped and attuned state.

export default function install(registry) {
  registry.registerWeaponExtraAttack({
    key: 'scimitar-of-speed',
    item: { name: 'Scimitar of Speed', source: 'XDMG' },
    cat: 'bonus',
    uses: 'Bonus Action (Scimitar of Speed)',
  });
}
