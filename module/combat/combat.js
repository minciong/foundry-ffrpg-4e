
 export const rollInitiative = async function(ids, {formula=null, updateTurn=true, messageOptions={}}={}) {

    // Structure input data
    ids = typeof ids === "string" ? [ids] : ids;
    const currentId = this.combatant?.id;
    const rollMode = messageOptions.rollMode || game.settings.get("core", "rollMode");

    // Iterate over Combatants, performing an initiative roll for each
    const updates = [];
    const messages = [];
    for ( let [i, id] of ids.entries() ) {

      // Get Combatant data (non-strictly)
      const combatant = this.combatants.get(id);
      if ( !combatant?.isOwner ) return results;

      // Produce an initiative roll for the Combatant
      const roll = combatant.getInitiativeRoll(formula);
      await roll.evaluate({async: true});
      const iDice=roll.dice[0].results.map(x=>x.result).sort(function(a, b){return a-b})
      updates.push({_id: id, initiative: roll.total,initDice:iDice,flags:{initDice:iDice}});
      // updates.push({_id: id, initiative: roll.total});

      // Construct chat message data
      let messageData = foundry.utils.mergeObject({
        speaker: ChatMessage.getSpeaker({
          actor: combatant.actor,
          token: combatant.token,
          alias: combatant.name
        }),
        flavor: game.i18n.format("COMBAT.RollsInitiative", {name: combatant.name}),
        flags: {"core.initiativeRoll": true}
      }, messageOptions);
      const chatData = await roll.toMessage(messageData, {
        create: false,
        rollMode: combatant.hidden && (["roll", "publicroll"].includes(rollMode)) ? "gmroll" : rollMode
      });

      // Play 1 sound for the whole rolled set
      if ( i > 0 ) chatData.sound = null;
      messages.push(chatData);
    }
    if ( !updates.length ) return this;

    // Update multiple combatants
    await this.updateEmbeddedDocuments("Combatant", updates);

    // Ensure the turn order remains with the same combatant
    if ( updateTurn && currentId ) {
      await this.update({turn: this.turns.findIndex(t => t.id === currentId)});
    }

    // Create multiple chat messages
    await ChatMessage.implementation.create(messages);
    return this;
  }

export const _getInitiativeFormula = function() {
  // const actor = combatant.actor;
  // if ( !actor ) return "3d10";
  const init = this.actor.data.data.initDice;
  
  
  // Apply Air tiebreaker
  const tiebreaker = (this.actor.data.data.abilities.air.value / 1000)+"";
  return init+"d10 + "+tiebreaker
};
export const nextTurn=async function () {
    let turn = this.turn;
    let skip = this.settings.skipDefeated;
    let phase = (this.round>0 && this.round%10==0)?10:this.round%10;
    let currentTurn = this.turns[turn];
    var iDice = currentTurn.data.flags.initDice
    while(iDice[0]==phase)iDice.shift();
    let init=(iDice.length>0)?iDice.reduce((a, c) => a + c)+(currentTurn.initiative*1000)%1000/1000:0;
    await this.setInitiative(currentTurn.id,init)
    await this.updateEmbeddedDocuments("Combatant", [{_id: currentTurn.id, initiative: init,initDice:iDice,flags:{initDice:iDice}}]);
    // Determine the next turn number
    let next = null;
    if ( skip ) {
      for ( let [i, t] of this.turns.entries() ) {
        if ( i <= turn ) continue;
        if ( !t.defeated ) {
          next = i;
          break;
        }
      }
    } else next = turn + 1;

    // Maybe advance to the next round
    let round = this.round;
    if ( (this.round === 0) || (next === null) || (next >= this.turns.length) ) {
      return this.nextRound();
    }

    // Update the encounter
    const advanceTime = CONFIG.time.turnTime;
    return this.update({round: round, turn: next}, {advanceTime});
  }


  export const _prepareCombatant = function(c, scene, players, settings={}) {

    // Populate data about the combatant
    c.token = scene.getEmbeddedEntity("Token", c.tokenId);
    c.actor = c.token ? Actor.fromToken(new Token(c.token, scene)) : null;
    c.name = c.name || c.token?.name || c.actor?.name || game.i18n.localize("COMBAT.UnknownCombatant");

    // Permissions and visibility
    c.permission = c.actor?.permission ?? 0;
    c.players = c.actor ? players.filter(u => c.actor.hasPerm(u, "OWNER")) : [];
    c.owner = game.user.isGM || (c.actor ? c.actor.owner : false);
    c.resource = c.actor ? getProperty(c.actor.data.data, settings.resource) : null;

    // Combatant thumbnail image
    c.img = c.img ?? c.token?.img ?? c.actor?.img ?? CONST.DEFAULT_TOKEN;
    if ( VideoHelper.hasVideoExtension(c.img) ) {
      game.video.createThumbnail(c.img, {width: 100, height: 100}).then(thumb => c.img = thumb);
    }

    // Set state information
    c.initiative = Number.isNumeric(c.initiative) ? Number(c.initiative) : null;
    c.initDice = c.flags.initDice? c.flags.initDice:[];
    c.visible = c.owner || !c.hidden;
    return c;
  }