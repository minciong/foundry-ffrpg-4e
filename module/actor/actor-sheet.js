/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class FFRPGActorSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["ffrpg4e", "sheet", "actor"],
      template: "systems/ffrpg4e/templates/actor/actor-sheet.html",
      width: 900,
      height: 800,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "stats" }]
    });
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    const data = super.getData();
    data.config = CONFIG.ffrpg4e;
    data.dtypes = ["String", "Number", "Boolean"];

    data.items = data.actor.items.filter(i=>i.type=="item");
    data.items.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    data.weapons = data.actor.items.filter(i=>i.type=="weapon");
    data.weapons.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    data.armor = data.actor.items.filter(i=>i.type=="armor");
    data.armor.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    data.actions = data.actor.items.filter(i=>i.type=="action");
    data.actions.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    console.log(data)
    return data;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Add Inventory Item
    html.find('.item-create').click(this._onItemCreate.bind(this));

    // Update Inventory Item
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.getOwnedItem(li.data("itemId"));
      item.sheet.render(true);
    });

    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      this.actor.deleteOwnedItem(li.data("itemId"));
      li.slideUp(200, () => this.render(false));
    });

    // Rollable abilities.
    html.find('.item .item-image').click(event => this._onItemRoll(event,html));
    // html.find('h4.item-name').click(event => this._onItemSummary(event));
    html.find('.rollable').click(this._onRoll.bind(this));
    if (this.actor.owner) {
    let handler = ev => this._onDragStart(ev);
    // Find all items on the character sheet.
    html.find('li.item').each((i, li) => {
      // Ignore for the header row.
      if (li.classList.contains("item-header")) return;
      // Add draggable attribute and dragstart listener.
      li.setAttribute("draggable", true);
      li.addEventListener("dragstart", handler, false);
    });
  }
  }

  /* -------------------------------------------- */

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  _onItemCreate(event) {
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
    return this.actor.createOwnedItem(itemData);
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

    if (dataset.roll) {
      let roll = new Roll(dataset.roll, this.actor.data.data);
      let label = dataset.label ? `Rolling ${dataset.label}` : '';
      roll.roll().toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: label
      });
    }
  }
  _onItemRoll(event,html) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".item").dataset.itemId;
    const item = this.actor.getOwnedItem(itemId);
    const actor = item.actor
    console.log(this);
    switch(item.data.type){
      case "action":console.log(item);this._handleAction(item);this._onSubmit(event);break
      case "armor":this._equipArmor(item);item.roll();this._onSubmit(event);break
      case "weapon":console.log("weapon");item.roll();break
      default: console.log(item);item.roll();break
    }
  }
  _equipArmor(armor){
    let actor = armor.actor;
    const update = actor.update({"data.arm":armor.data.data.arm, "data.marm":armor.data.data.marm})
    

  }
  _handleAction(action){
    let actor = action.actor;
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
  _onItemSummary(event) {
    event.preventDefault();
    let li = $(event.currentTarget).parents(".item"),
        item = this.actor.getOwnedItem(li.data("item-id")),
        chatData = item.getChatData({secrets: this.actor.owner});

    // Toggle summary
    if ( li.hasClass("expanded") ) {
      let summary = li.children(".item-summary");
      summary.slideUp(200, () => summary.remove());
    } else {
      let div = $(`<div class="item-summary">${chatData.description.value}</div>`);
      let props = $(`<div class="item-properties"></div>`);
      chatData.properties.forEach(p => props.append(`<span class="tag">${p}</span>`));
      div.append(props);
      li.append(div.hide());
      div.slideDown(200);
    }
    li.toggleClass("expanded");
  }
}
