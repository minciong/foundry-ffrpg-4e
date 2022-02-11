/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class ffrpg4eItem extends Item {
  /**
   * Augment the basic Item data model with additional dynamic data.
   */
  prepareData() {
    // As with the actor class, items are documents that can have their data
    // preparation methods overridden (such as prepareBaseData()).
    super.prepareData();
    // Get the Item's data
    const itemData = this.data;
    const actorData = this.actor ? this.actor.data : {};
    const data = itemData.data;
    if(itemData.type=="action"){
      if(data.actionSpeed==0){
        data.speedName=CONFIG.FFRPG4E.speedTypes.quick
      }
      else if(data.actionSpeed>0&&data.actionSpeed<=10){
        data.speedName=CONFIG.FFRPG4E.speedTypes.slow
      }
      else{
       data.speedName=CONFIG.FFRPG4E.speedTypes.reaction
      }

    }
  }
getChatData(htmlOptions={}) {
    const data = duplicate(this.data.data);
    const labels = this.labels;

    // Rich text description
    data.description = data.description?TextEditor.enrichHTML(data.description, htmlOptions):'';

    // Item type specific properties
    const props = [];
    const fn = this[`_${this.data.type}ChatData`];
    if ( fn ) fn.bind(this)(data, labels, props);
    data.properties = props.filter(p => !!p);
    return data;
  }
  /**
   * Prepare a data object which is passed to any Roll formulas which are created related to this Item
   * @private
   */
   getRollData() {
    // If present, return the actor's roll data.
    if ( !this.actor ) return null;
    const rollData = this.actor.getRollData();
    rollData.item = foundry.utils.deepClone(this.data.data);
    const abl = this.data.data.userStat;
    if ( abl ) {
      const ability = rollData.abilities[abl];
      rollData["mod"] = ability.value || 0;
      rollData["dmg"] = ability.level*this.data.data.damageBase*this.data.data.actionModifier + this.data.data.bonusMod|| 0;
    }
    return rollData;
  }
  get hasDamage(){
    return this.data.data.damageBase>0 && this.data.data.damageBase!=null

  }
  get hasAttack(){
    return this.data.data.difficulty>=0 && this.data.data.difficulty!=null

  }
  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  async roll() {
    if(this.hasAttack||this.hasDamage){
      this.rollAttack();
      return
    }
    const item = this.data;

    // Basic template rendering data
    const token = this.actor.token;
    const templateData = {
      actor: this.actor,
      tokenId: token ? `${token.scene.id}.${token.id}` : null,
      item: this.data,
      // data: this.getChatData()
    };

    // Render the chat card template
    const templateType = this.data.type//["tool"].includes(this.data.type) ? this.data.type : "item";
    const template = `systems/ffrpg4e/templates/chat/${templateType}-card.html`;
    const html = await renderTemplate(template, templateData);


    // Initialize chat data.
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    const rollMode = game.settings.get('core', 'rollMode');
    const label = `[${item.type}] ${item.name}`;

    // If there's no roll data, send a chat message.
    if (!this.data.data.formula) {
      ChatMessage.create({
        speaker: speaker,
        rollMode: rollMode,
        flavor: label,
        content: item.data.description ?? ''
      });
    }
    // Otherwise, create a roll and send a chat message from it.
    else {
      // Retrieve roll data.
      const rollData = this.getRollData();

      // Invoke the roll and submit it to chat.
      const roll = new Roll(rollData.item.formula, rollData);
      // If you need to store the value first, uncomment the next line.
      // let result = await roll.roll({async: true});
      roll.toMessage({
        speaker: speaker,
        rollMode: rollMode,
        flavor: label,
      });
      return roll;
    }
  }
  async rollAttack({rollMode=null}={},options={}) {
    const itemData = this.data.data;
    const actorData = this.actor.data.data;
    // if ( !this.data.data.damageBase ) {
    //   this.roll();
    //   throw new Error("You may not place an Attack Roll with this Item.");
    //   return;
    // }
    let title = `${this.name}`;
    const rollData = this.getRollData();

    // Define Roll bonuses
    const parts = [`@mod`];

   

   
    let formula = `1d100`;
    parts.unshift(formula);
    let roll = new Roll(parts.join(" + "),rollData);
    roll.evaluate({async:true})

    let d100=roll.dice[0].results[0].result;
    let crit =(d100%10==Math.floor(d100/10)%10)
    rollData["dmg"]+=(d100%10==0)?10:d100%10;
    const messageOptions = {rollMode: rollMode || game.settings.get("core", "rollMode")};
    let localUser = game.i18n.localize(`FFRPG4E.stats.${itemData.userStat}`)
    let localTarget = game.i18n.localize(`FFRPG4E.stats.${itemData.targetStat}`)
    let flavor = `${this.name} - ${localUser} vs ${localTarget}`;
    flavor += this.hasAttack?` (DC: ${itemData.difficulty})`:``;
    const isPrivate = options.isPrivate;
    let messageData={itemId: this.id,speaker: ChatMessage.getSpeaker({actor: this.actor}),flavor:flavor}; 
    let damageTooltip=`${rollData.abilities[itemData.userStat].level} * ${itemData.damageBase} * ${itemData.actionModifier} + ${(d100%10==0)?10:d100%10} + ${itemData.bonusMod}`

    const token = this.actor.token;
    const templateData = {
      actor: this.actor,
      tokenId: token ? `${token.scene.id}.${token.id}` : null,
      item: this.data,
      data: this.getChatData(),
      tooltip: isPrivate ? "" : await roll.getTooltip(),
      damageTooltip: damageTooltip,
      total: isPrivate ? "?" : Math.round(roll.total * 100) / 100,
      damage:rollData["dmg"],
      damageElement: game.i18n.localize(`FFRPG4E.element.${itemData.element}`),
      damageType: game.i18n.localize(`FFRPG4E.damage.${itemData.damageType}`),
      formula:roll.formula,
      isCrit:crit,
      difficulty:itemData.difficulty,
      postDiff:roll.total-itemData.difficulty,
      hasAttack:this.hasAttack,
      hasDamage:this.hasDamage,
      speed:(itemData.actionSpeed>0)?"("+itemData.actionSpeed+")":""

    };

    // Render the chat card template
    const templateType = this.data.type//["tool"].includes(this.data.type) ? this.data.type : "item";
    const template = `systems/ffrpg4e/templates/chat/${templateType}-card.html`;
    const html = await renderTemplate(template, templateData);
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    
    // Basic chat message data
    const chatData = {
      user: game.user.id,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      content: html,
      roll:roll,
      flavor: flavor,
      speaker: speaker,
      flags: {"core.canPopout": true}
    };
    // Toggle default roll mode
    rollMode = rollMode || game.settings.get("core", "rollMode")
    // if ( ["gmroll", "blindroll"].includes(rollMode) ) chatData["whisper"] = ChatMessage.getWhisperRecipients("GM");
    // if ( rollMode === "blindroll" ) chatData["blind"] = true;
    await ChatMessage.applyRollMode(chatData, rollMode)

    // Create the chat message
    await ChatMessage.create(chatData);
    // await roll.toMessage(messageData);
    // return roll;
  }
}
