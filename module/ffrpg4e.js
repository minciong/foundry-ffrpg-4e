// Import Modules
import { FFRPGActor } from "./actor/actor.js";
import { FFRPGActorSheet } from "./actor/actor-sheet.js";
import { FFRPGItem } from "./item/item.js";
import { FFRPGItemSheet } from "./item/item-sheet.js";
import { FFCombatTracker } from "./combat/combat-tracker.js";
import { FFCombatTrackerConfig } from "./combat/combat-tracker-config.js";
// import { createFFRPG4eMacro, rollItemMacro } from "./macros.js";
import * as FFCombat from "./combat/combat.js";
import {ffrpg4e} from "./config.js"
Hooks.once('init', async function() {

  game.ffrpg4e = {
    FFRPGActor,
    FFRPGItem,
    rollItemMacro
  };
  Hooks.on("hotbarDrop", (bar, data, slot) => createFFRPG4eMacro(data, slot));
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
  // Combat.prototype._prepareCombatant = FFCombat._prepareCombatant;
  Combat.prototype.nextTurn = FFCombat.nextTurn
  CONFIG.Actor.entityClass = FFRPGActor;
  CONFIG.Item.entityClass = FFRPGItem;
  CONFIG.ffrpg4e = ffrpg4e;
  CONFIG.ui.combat=FFCombatTracker;
  Combat.CONFIG_SETTING = FFCombatTrackerConfig
  
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
/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createFFRPG4eMacro(data, slot) {
  if (data.type !== "Item") return;
  if (!("data" in data)) return ui.notifications.warn("You can only create macro buttons for owned Items");
  const item = data.data;

  // Create the macro command
  const command = `game.ffrpg4e.rollItemMacro("${item.name}");`;
  let macro = game.macros.entities.find(m => (m.name === item.name) && (m.command === command));
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: "script",
      img: item.img,
      command: command,
      flags: { "boilerplate.itemMacro": true }
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemName
 * @return {Promise}
 */
function rollItemMacro(itemName) {
  const speaker = ChatMessage.getSpeaker();
  let actor;
  if (speaker.token) actor = game.actors.tokens[speaker.token];
  if (!actor) actor = game.actors.get(speaker.actor);
  const item = actor ? actor.items.find(i => i.name === itemName) : null;
  if (!item) return ui.notifications.warn(`Your controlled Actor does not have an item named ${itemName}`);

  // Trigger the item roll
  return item.roll();
}
