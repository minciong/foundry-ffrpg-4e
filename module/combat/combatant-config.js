export class FFCombatantConfig extends FormApplication {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "combatant-config",
      title: game.i18n.localize("COMBAT.CombatantConfig"),
      classes: ["sheet", "combat-sheet"],
      template: "systems/ffrpg4e/templates/combat/combatant-config.html",
      width: 420
    });
  }

  /* -------------------------------------------- */

  /** @override */
  get title() {
    return game.i18n.localize(this.object._id ? "COMBAT.CombatantUpdate" : "COMBAT.CombatantCreate");
  }

  /* -------------------------------------------- */

  /** @override */
  async _updateObject(event, formData) {
    formData.initDice=formData.initDice.split(',').map(die=>parseInt(die)).sort(function(a, b){return a-b}).filter(d=>d>0&&d<=10)
    formData.initiative=(formData.initiative*1000)%1000/1000+formData.initDice.reduce((a,b)=>a+b)
    console.log(formData);
    if ( this.object._id ) {
      formData._id = this.object._id;
      return game.combat.updateCombatant(formData);
    }
    return game.combat.createCombatant(formData);
  }
}