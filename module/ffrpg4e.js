// Import Modules
import { FFRPGActor } from "./actor/actor.js";
import { FFRPGActorSheet } from "./actor/actor-sheet.js";
import { FFRPGItem } from "./item/item.js";
import { FFRPGItemSheet } from "./item/item-sheet.js";
import { FFCombatTracker } from "./combat/combat-tracker.js";
import { FFCombatTrackerConfig } from "./combat/combat-tracker-config.js";
import * as FFCombat from "./combat/combat.js";
import {ffrpg4e} from "./config.js"
Hooks.once('init', async function() {

  game.ffrpg4e = {
    FFRPGActor,
    FFRPGItem
  };

  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    formula: "3d10",
    decimals: 3
  };

  // Define custom Entity classes
  // CONFIG.Combat.entityClass = FFCombat;
  Combat.prototype._getInitiativeRoll = FFCombat._getInitiativeRoll;
  Combat.prototype.rollInitiative = FFCombat.rollInitiative;
  Combat.prototype.setInitiative=FFCombat.setInitiative
  Combat.prototype._getInitiativeFormula = FFCombat._getInitiativeFormula;
  Combat.prototype.nextTurn = FFCombat.nextTurn
  CONFIG.Actor.entityClass = FFRPGActor;
  CONFIG.Item.entityClass = FFRPGItem;
  CONFIG.ffrpg4e = ffrpg4e;
  CONFIG.ui.combat=FFCombatTracker;
  // Combat.CONFIG_SETTING = FFCombatTrackerConfig
  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("ffrpg4e", FFRPGActorSheet, { makeDefault: true });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("ffrpg4e", FFRPGItemSheet, { makeDefault: true });

  // If you need to add Handlebars helpers, here are a few useful examples:
  Handlebars.registerHelper('concat', function() {
    var outStr = '';
    for (var arg in arguments) {
      if (typeof arguments[arg] != 'object') {
        outStr += arguments[arg];
      }
    }
    return outStr;
  });

  Handlebars.registerHelper('toLowerCase', function(str) {
    return str.toLowerCase();
  });
  Handlebars.registerHelper('if_eq', function(a, b, opts) {
    if (a == b) {
        return opts.fn(this);
    } else {
        return opts.inverse(this);
    }
});
});