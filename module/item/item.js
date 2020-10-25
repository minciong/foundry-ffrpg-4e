/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class FFRPGItem extends Item {
  /**
   * Augment the basic Item data model with additional dynamic data.
   */
  prepareData() {
    super.prepareData();

    // Get the Item's data
    const itemData = this.data;
    const actorData = this.actor ? this.actor.data : {};
    const data = itemData.data;
    if(itemData.type=="action"){
      if(data.actionSpeed==0){
        data.speedName=CONFIG.ffrpg4e.speedTypes.quick
      }
      else if(data.actionSpeed>0&&data.actionSpeed<=10){
        data.speedName=CONFIG.ffrpg4e.speedTypes.slow
      }
      else{
       data.speedName=CONFIG.ffrpg4e.speedTypes.reaction
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
  get hasDamage(){
    return this.data.data.damageBase>0 && this.data.data.damageBase!=null

  }
  get hasAttack(){
    return this.data.data.difficulty>=0 && this.data.data.difficulty!=null

  }
  async roll({configureDialog=true, rollMode=null, createMessage=true}={}) {
    if(this.hasAttack||this.hasDamage){
      this.rollAttack();
      return}
    // Basic template rendering data
    const token = this.actor.token;
    const templateData = {
      actor: this.actor,
      tokenId: token ? `${token.scene._id}.${token.id}` : null,
      item: this.data,
      data: this.getChatData()
    };

    // Render the chat card template
    const templateType = this.data.type//["tool"].includes(this.data.type) ? this.data.type : "item";
    const template = `systems/ffrpg4e/templates/chat/${templateType}-card.html`;
    const html = await renderTemplate(template, templateData);

    // Basic chat message data
    const chatData = {
      user: game.user._id,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER,
      content: html,
      flavor: this.name,
      speaker: {
        actor: this.actor._id,
        token: this.actor.token,
        alias: this.actor.name
      },
      flags: {"core.canPopout": true}
    };
    // Toggle default roll mode
    rollMode = rollMode || game.settings.get("core", "rollMode");
    if ( ["gmroll", "blindroll"].includes(rollMode) ) chatData["whisper"] = ChatMessage.getWhisperRecipients("GM");
    if ( rollMode === "blindroll" ) chatData["blind"] = true;

    // Create the chat message
    if ( createMessage ) return ChatMessage.create(chatData);
    else return chatData;
  }
   /* -------------------------------------------- */

  /**
   * Prepare a data object which is passed to any Roll formulas which are created related to this Item
   * @private
   */
  getRollData() {
    if ( !this.actor ) return null;
    const rollData = this.actor.getRollData();
    rollData.item = duplicate(this.data.data);

    // Include an ability score modifier if one exists
    const abl = this.data.data.userStat;
    if ( abl ) {
      const ability = rollData.abilities[abl];
      rollData["mod"] = ability.value || 0;
      rollData["dmg"] = ability.level*this.data.data.damageBase || 0;
    }

    return rollData;
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
    let roll = new Roll(parts.join(" + "),rollData).roll();
    let crit =(roll.results[0]%10==Math.floor(roll.results[0]/10)%10)
    rollData["dmg"]+=(roll.results[0]%10==0)?10:roll.results[0]%10;
    const messageOptions = {rollMode: rollMode || game.settings.get("core", "rollMode")};
    let localUser = game.i18n.localize(`ffrpg4e.stats.${itemData.userStat}`)
    let localTarget = game.i18n.localize(`ffrpg4e.stats.${itemData.targetStat}`)
    let flavor = `${this.name} - ${localUser} vs ${localTarget}`;
    flavor += this.hasAttack?` (DC: ${itemData.difficulty})`:``;
    const isPrivate = options.isPrivate;
    let messageData={itemId: this.id,speaker: ChatMessage.getSpeaker({actor: this.actor}),flavor:flavor}; 
    let damageTooltip=`${rollData.abilities[itemData.userStat].level} * ${itemData.damageBase} + ${(roll.results[0]%10==0)?10:roll.results[0]%10}`

    const token = this.actor.token;
    const templateData = {
      actor: this.actor,
      tokenId: token ? `${token.scene._id}.${token.id}` : null,
      item: this.data,
      data: this.getChatData(),
      tooltip: isPrivate ? "" : await roll.getTooltip(),
      damageTooltip: damageTooltip,
      total: isPrivate ? "?" : Math.round(roll.total * 100) / 100,
      damage:rollData["dmg"],
      damageElement: game.i18n.localize(`ffrpg4e.element.${itemData.element}`),
      damageType: game.i18n.localize(`ffrpg4e.damage.${itemData.damageType}`),
      formula:roll.formula,
      isCrit:crit,
      difficulty:itemData.difficulty,
      postDiff:roll.total-itemData.difficulty,
      hasAttack:this.hasAttack,
      hasDamage:this.hasDamage

    };

    // Render the chat card template
    const templateType = this.data.type//["tool"].includes(this.data.type) ? this.data.type : "item";
    const template = `systems/ffrpg4e/templates/chat/${templateType}-card.html`;
    const html = await renderTemplate(template, templateData);

    // Basic chat message data
    const chatData = {
      user: game.user._id,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      content: html,
      flavor: flavor,
      speaker: {
        actor: this.actor._id,
        token: this.actor.token,
        alias: this.actor.name
      },
      flags: {"core.canPopout": true}
    };
    // Toggle default roll mode
    rollMode = rollMode || game.settings.get("core", "rollMode")
    if ( ["gmroll", "blindroll"].includes(rollMode) ) chatData["whisper"] = ChatMessage.getWhisperRecipients("GM");
    if ( rollMode === "blindroll" ) chatData["blind"] = true;
    

    // Create the chat message
    await ChatMessage.create(chatData);
    // await roll.toMessage(messageData);
    // return roll;
  }
  
}