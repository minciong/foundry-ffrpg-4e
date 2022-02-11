export class FFCombatantConfig extends DocumentSheet {
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
    return game.i18n.localize(this.object.id ? "COMBAT.CombatantUpdate" : "COMBAT.CombatantCreate");
  }

  /* -------------------------------------------- */
  getData(options){
    console.log(super.getData(options))
    return mergeObject(super.getData(options),{
      user:game.user
    });
  }
  /** @override */
  async _updateObject(event, formData) {
    formData.initDice=formData.initDice.split(',').map(die=>parseInt(die)).sort(function(a, b){return a-b}).filter(d=>d>0&&d<=10)
    formData.flags={initDice:formData.initDice}

    console.log(formData,typeof(formData));
    if ( this.object.id ) {
      formData.id = this.object.id;
      formData.initiative=(this.object.initiative*1000)%1000/1000+formData.initDice.reduce((a,b)=>a+b)
      delete formData.initDice;
      console.log(formData);
      return this.object.update(formData);
    }
    else {
      const cls = getDocumentClass("Combatant");
      return cls.create(formData, {parent: game.combat});
    }
  }
}