export class FFCombatTrackerConfig extends FormApplication {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "combat-config",
      title: game.i18n.localize("COMBAT.Settings"),
      classes: ["sheet", "combat-sheet"],
      template: "systems/ffrpg4e/templates/combat/combat-config.html",
      width: 420
    });
  }

  /* -------------------------------------------- */

  /** @override */
  async getData(options) {
    console.log(this)
    console.log("attributes",this.getAttributeChoices())
    return {
      settings: game.settings.get("core", Combat.CONFIG_SETTING),
      attributeChoices: this.getAttributeChoices()
    };
  };

  /* -------------------------------------------- */

  /** @override */
  async _updateObject(event, formData) {
    console.log("formdata", formData);
    return game.settings.set("core", Combat.CONFIG_SETTING, {
      resource: formData.resource,
      thing: formData.thing,
      skipDefeated: formData.skipDefeated
    });
  }

  /* -------------------------------------------- */

  /**
   * Get an Array of attribute choices which could be tracked for Actors in the Combat Tracker
   * @return {Promise<Array>}
   */
  getAttributeChoices() {
    const actorData = {};
    for ( let model of Object.values(game.system.model.Actor) ) {
      mergeObject(actorData, model);
    }
    const attributes = TokenConfig.getTrackedAttributes(actorData, []);
    attributes.bar.forEach(a => a.push("value"));
    return TokenConfig.getTrackedAttributeChoices(attributes);
  }
}
