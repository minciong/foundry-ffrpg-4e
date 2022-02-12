import {onManageActiveEffect, prepareActiveEffectCategories} from "../helpers/effects.mjs";

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class ffrpg4eActorSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["ffrpg4e", "sheet", "actor"],
      template: "systems/ffrpg4e/templates/actor/actor-sheet.html",
      width: 900,
      height: 800,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "features" }]
    });
  }

  /** @override */
  get template() {
    return `systems/ffrpg4e/templates/actor/actor-${this.actor.data.type}-sheet.html`;
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    // Retrieve the data structure from the base sheet. You can inspect or log
    // the context variable to see the structure, but some key properties for
    // sheets are the actor object, the data object, whether or not it's
    // editable, the items array, and the effects array.
    const context = super.getData();

    // Use a safe clone of the actor data for further operations.
    const actorData = this.actor.data.toObject(false);

    // Add the actor's data to context.data for easier access, as well as flags.
    context.data = actorData.data;
    context.flags = actorData.flags;

    // Prepare character data and items.
    if (actorData.type == 'character') {
      this._prepareItems(context);
      this._prepareCharacterData(context);
    }

    // Add roll data for TinyMCE editors.
    context.rollData = context.actor.getRollData();

    // Prepare active effects
    context.effects = prepareActiveEffectCategories(this.actor.effects);
    
    context.config = CONFIG.FFRPG4E;
    context.dtypes = ["String","Number", "Boolean"];
    return context;
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterData(context) {
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareItems(context) {
    // Initialize containers.
    const gear = [];
    const actions = [];
    const weapons = [];
    const armor = [];
    const spells = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
      7: [],
      8: [],
      9: []
    };

    // Iterate through items, allocating to containers
    for (let i of context.items) {
      i.img = i.img || DEFAULT_TOKEN;
      // Append to gear.
      if (i.type === 'item') {
        gear.push(i);
      }
      // Append to features.
      else if (i.type === 'action') {
        actions.push(i);
      }
      // Append to features.
      else if (i.type === 'weapon') {
        weapons.push(i);
      }
      // Append to features.
      else if (i.type === 'armor') {
        armor.push(i);
      }
      // Append to spells.
      else if (i.type === 'spell') {
        if (i.data.spellLevel != undefined) {
          spells[i.data.spellLevel].push(i);
        }
      }
    }
    // Assign and return
    context.gear = gear;
    context.actions = actions;
    context.spells = spells;
    context.weapons = weapons;
    context.armor = armor;
    context.actions.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    context.gear.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    context.weapons.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    context.armor.sort((a, b) => (a.sort || 0) - (b.sort || 0));
   }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Render the item sheet for viewing/editing prior to the editable check.
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.sheet.render(true);
    });

    // -------------------------------------------------------------
    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Add Inventory Item
    html.find('.item-create').click(this._onItemCreate.bind(this));

    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.delete();
      li.slideUp(200, () => this.render(false));
    });

    // Active Effect management
    html.find(".effect-control").click(ev => onManageActiveEffect(ev, this.actor));

    // Rollable abilities.
    html.find('.rollable').click(this._onRoll.bind(this));
    // html.find('.itemroll').click(event => this._onItemRoll(event,html));

    // Drag events for macros.
    if (this.actor.owner) {
      let handler = ev => this._onDragStart(ev);
      html.find('li.item').each((i, li) => {
        if (li.classList.contains("inventory-header")) return;
        li.setAttribute("draggable", true);
        li.addEventListener("dragstart", handler, false);
      });
    }
  }

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create.
    const type = header.dataset.type;
    // Grab any data associated with this control.
    const data = duplicate(header.dataset);
    // Initialize a default name.
    const name = `New ${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      data: data
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.data["type"];

    // Finally, create the item!
    return await Item.create(itemData, {parent: this.actor});
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;

    // Handle item rolls.
    if (dataset.rollType) {
      if (dataset.rollType == 'item') {
        const itemId = element.closest('.item').dataset.itemId;
        const item = this.actor.items.get(itemId);
        const actor = this.actor;
        if (item){ 
          let itemRoll;
          switch(item.data.type){
            case "action":console.log(item);itemRoll = this._handleAction(actor, item);this._onSubmit(event);break
            case "armor":this._equipArmor(actor, item);itemRoll = item.roll();this._onSubmit(event);break
            case "weapon":console.log("weapon");itemRoll = item.roll();break
            default: console.log(item);itemRoll =  item.roll();break
          }
          return itemRoll
        }
      }
    }

    // Handle rolls that supply the formula directly.
    if (dataset.roll) {
      let label = dataset.label ? `[roll] ${dataset.label}` : '';
      let roll = new Roll(dataset.roll, this.actor.getRollData());
      roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: label,
        rollMode: game.settings.get('core', 'rollMode'),
      });
      return roll;
    }
  }
_onItemRoll(event,html) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".item").dataset.itemId;
    const item = this.actor.items.get(itemId);
    const actor = this.actor
    console.log(this);
    switch(item.data.type){
      case "action":console.log(item);this._handleAction(item);this._onSubmit(event);break
      case "armor":this._equipArmor(item);item.roll();this._onSubmit(event);break
      case "weapon":console.log("weapon");item.roll();break
      default: console.log(item);item.roll();break
    }
  }
  _equipArmor(actor, armor){
    // let actor = armor.actor;
    const update = actor.update({"data.arm":armor.data.data.arm, "data.marm":armor.data.data.marm})
    

  }
  _handleAction(actor, action){
    // let actor = action.actor;
    if((action.data.data.mpCost>0&&actor.data.data.mana.value>=action.data.data.mpCost)){
        let deltamp= actor.data.data.mana.value-action.data.data.mpCost
        actor.update({"data.mana.value":deltamp})
      }
      if((action.data.data.hpCost>0&&actor.data.data.health.value>=action.data.data.hpCost)){
        let deltahp= actor.data.data.health.value-action.data.data.hpCost
        actor.update({"data.health.value":deltahp})
      }
        action.roll();
  }
}
