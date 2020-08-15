// Import Modules
import { FFRPGActor } from "./actor/actor.js";
import { FFRPGActorSheet } from "./actor/actor-sheet.js";
import { FFRPGItem } from "./item/item.js";
import { FFRPGItemSheet } from "./item/item-sheet.js";

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
    formula: "1d20",
    decimals: 2
  };

  // Define custom Entity classes
  CONFIG.Actor.entityClass = FFRPGActor;
  CONFIG.Item.entityClass = FFRPGItem;

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
});