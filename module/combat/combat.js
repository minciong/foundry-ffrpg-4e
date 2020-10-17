export const _getInitiativeRoll = function(combatant, formula) {
    const rollData = combatant.actor ? combatant.actor.getRollData() : {};
    
    return new Roll(formula, rollData).roll();
  }
export const rollInitiative = async function(ids, formula=null, messageOptions={}) {
    // Structure input data
    ids = typeof ids === "string" ? [ids] : ids;
    const currentId = this.combatant._id;

    // Iterate over Combatants, performing an initiative roll for each
    const [updates, messages] = ids.reduce((results, id, i) => {
      let [updates, messages] = results;

      // Get Combatant data
      const c = this.getCombatant(id);
      if ( !c || !c.owner ) return results;

      // Roll initiative
      const cf = formula || this._getInitiativeFormula(c);
      const roll = this._getInitiativeRoll(c, cf);
      const iDice=roll._dice[0].rolls.map(x=>x.roll).sort(function(a, b){return a-b})
      updates.push({_id: id, initiative: roll.total,initDice:iDice});

      // Determine the roll mode
      let rollMode = messageOptions.rollMode || game.settings.get("core", "rollMode");
      if (( c.token.hidden || c.hidden ) && (rollMode === "roll") ) rollMode = "gmroll";

      // Construct chat message data
      let messageData = mergeObject({
        speaker: {
          scene: canvas.scene._id,
          actor: c.actor ? c.actor._id : null,
          token: c.token._id,
          alias: c.token.name
        },
        flavor: `${c.token.name} rolls for Initiative!`
      }, messageOptions);
      const chatData = roll.toMessage(messageData, {rollMode, create:false});
      if ( i > 0 ) chatData.sound = null;   // Only play 1 sound for the whole set
      messages.push(chatData);

      // Return the Roll and the chat data
      return results;
    }, [[], []]);
    if ( !updates.length ) return this;
    await console.log("updates",updates)
    // Update multiple combatants
    await this.updateEmbeddedEntity("Combatant", updates);
    // await this.update(updates)

    // Ensure the turn order remains with the same combatant
    await this.update({turn: this.turns.findIndex(t => t._id === currentId)});
    // const data  = duplicate(this.data.combatants);
    // await this.update({data},{diff:true})

    // Create multiple chat messages
    await CONFIG.ChatMessage.entityClass.create(messages);

    // Return the updated Combat
    return this;
  }
export const setInitiative= async function(id, value) {
    const currentId = this.combatant._id;
    await console.log("testt",this.combatant);
    await this.updateCombatant({_id: id, initiative: value}, {});
    await this.update({turn: this.turns.findIndex(c => c._id === currentId)});
  }
export const _getInitiativeFormula = function(combatant) {
  const actor = combatant.actor;
  if ( !actor ) return "3d10";
  const init = actor.data.data.initDice;
  
  
  // Apply Air tiebreaker
  const tiebreaker = (actor.data.data.abilities.air.value / 1000)+"";
  return init+"d10 + "+tiebreaker
};
export const nextTurn=async function () {
    let turn = this.turn;
    let skip = this.settings.skipDefeated;
    let phase = (this.round>0 && this.round%10==0)?10:this.round%10;
    let currentTurn = this.turns[turn];
    var iDice = currentTurn.initDice
    while(iDice[0]==phase)iDice.shift();
    let init=(iDice.length>0)?iDice.reduce((a, c) => a + c):0;
    await this.updateCombatant({_id: currentTurn._id, initiative: init,initDice:iDice}, {});
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
      round = round + 1;
      next = 0;
      if ( skip ) {
        next = this.turns.findIndex(t => !t.defeated);
        if (next === -1) {
          ui.notifications.warn(game.i18n.localize("COMBAT.NoneRemaining"));
          next = 0;
        }
      }
    }

    // Update the encounter
    return this.update({round: round, turn: next});
  }
class Combat extends Entity {
  constructor(...args) {
    super(...args);

    /**
     * Track the sorted turn order of this combat encounter
     * @type {Array}
     */
    this.turns;

    /**
     * Record the current round, turn, and tokenId to understand changes in the encounter state
     * @type {Object}
     * @private
     */
    this.current = {
      round: null,
      turn: null,
      tokenId: null
    };

    /**
     * Track the previous round, turn, and tokenId to understand changes in the encounter state
     * @type {Object}
     * @private
     */
    this.previous = {
      round: null,
      turn: null,
      tokenId: null
    };

    /**
     * Track whether a sound notification is currently being played to avoid double-dipping
     * @type {Boolean}
     * @private
     */
    this._soundPlaying = false;
  }

  /* -------------------------------------------- */

  /**
   * Configure the attributes of the Folder Entity
   *
   * @returns {Entity} baseEntity       The parent class which directly inherits from the Entity interface.
   * @returns {EntityCollection} collection   The EntityCollection class to which Entities of this type belong.
   * @returns {Array} embeddedEntities  The names of any Embedded Entities within the Entity data structure.
   */
  static get config() {
    return {
      baseEntity: Combat,
      collection: game.combats,
      embeddedEntities: { "Combatant": "combatants" },
      label: "ENTITY.Combat"
    };
  }

	/* -------------------------------------------- */

  /**
   * Prepare Embedded Entities which exist within the parent Combat.
   * For example, in the case of an Actor, this method is responsible for preparing the Owned Items the Actor contains.
   */
	prepareEmbeddedEntities() {
	  this.turns = this.setupTurns();
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * A convenience reference to the Array of combatant data within the Combat entity
   * @type {Array.<Object>}
   */
  get combatants() {
    return this.data.combatants;
  }

  /* -------------------------------------------- */

  /**
   * Get the data object for the Combatant who has the current turn
   * @type {Object}
   */
  get combatant() {
    return this.turns[this.data.turn];
  }

  /* -------------------------------------------- */

  /**
   * The numeric round of the Combat encounter
   * @type {number}
   */
  get round() {
    return this.data.round;
  }

  /* -------------------------------------------- */

  /**
   * The numeric turn of the combat round in the Combat encounter
   * @type {number}
   */
  get turn() {
    return this.data.turn;
  }

  /* -------------------------------------------- */

  /**
   * Get the Scene entity for this Combat encounter
   * @return {Scene}
   */
  get scene() {
    return game.scenes.get(this.data.scene);
  }

  /* -------------------------------------------- */

  /**
   * Return the object of settings which modify the Combat Tracker behavior
   * @return {Object}
   */
  get settings() {
    return this.collection.settings;
  }

  /* -------------------------------------------- */

  /**
   * Has this combat encounter been started?
   * @type {Boolean}
   */
  get started() {
    return ( this.turns.length > 0 ) && ( this.round > 0 );
  }

  /* -------------------------------------------- */
  /*  Combat Control Methods                      */
  /* -------------------------------------------- */

  /**
   * Set the current Combat encounter as active within the Scene.
   * Deactivate all other Combat encounters within the viewed Scene and set this one as active
   * @return {Promise.<Combat>}
   */
  async activate() {
    const scene = game.scenes.viewed;
    const updates = this.collection.entities.reduce((arr, c) => {
      if ( (c.data.scene === scene.id) && c.data.active ) arr.push({_id: c.data._id, active: false});
      return arr;
    }, []);
    updates.push({_id: this.id, active: true});
    return this.constructor.update(updates);
  }

  /* -------------------------------------------- */

  /**
   * Return the Array of combatants sorted into initiative order, breaking ties alphabetically by name
   * @return {Array}
   */
  setupTurns() {
    const scene = game.scenes.get(this.data.scene);
    const players = game.users.players;

    // Populate additional data for each combatant
    let turns = this.data.combatants.map(c => {
      c.token = scene.getEmbeddedEntity("Token", c.tokenId);
      if ( !c.token ) return c;
      c.actor = Actor.fromToken(new Token(c.token, scene));
      c.players = c.actor ? players.filter(u => c.actor.hasPerm(u, "OWNER")) : [];
      c.owner = game.user.isGM || (c.actor ? c.actor.owner : false);
      c.visible = c.owner || !c.hidden;
      return c;
    }).filter(c => c.token);

    // Sort turns into initiative order: (1) initiative, (2) name, (3) tokenId
    turns = turns.sort((a, b) => {
      const ia = Number.isNumeric(a.initiative) ? a.initiative : -9999;
      const ib = Number.isNumeric(b.initiative) ? b.initiative : -9999;
      let ci = ib - ia;
      if ( ci !== 0 ) return ci;
      let [an, bn] = [a.token.name || "", b.token.name || ""];
      let cn = an.localeCompare(bn);
      if ( cn !== 0 ) return cn;
      return a.tokenId - b.tokenId;
    });

    // Ensure the current turn is bounded
    this.data.turn = Math.clamped(this.data.turn, 0, turns.length-1);
    this.turns = turns;

    // When turns change, tracked resources also change
    if ( ui.combat ) ui.combat.updateTrackedResources();
    return this.turns;
  }

  /* -------------------------------------------- */

  /**
   * Begin the combat encounter, advancing to round 1 and turn 1
   * @return {Promise}
   */
  async startCombat() {
    return this.update({round: 1, turn: 0});
  }

  /* -------------------------------------------- */

  /**
   * Advance the combat to the next turn
   * @return {Promise}
   */
  async nextTurn() {
    let turn = this.turn;
    let skip = this.settings.skipDefeated;

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
      round = round + 1;
      next = 0;
      if ( skip ) {
        next = this.turns.findIndex(t => !t.defeated);
        if (next === -1) {
          ui.notifications.warn(game.i18n.localize("COMBAT.NoneRemaining"));
          next = 0;
        }
      }
    }

    // Update the encounter
    return this.update({round: round, turn: next});
  }

  /* -------------------------------------------- */

  /**
   * Rewind the combat to the previous turn
   * @return {Promise}
   */
  async previousTurn() {
    if ( this.turn === 0 && this.round === 0 ) return Promise.resolve();
    else if ( this.turn === 0 ) return this.previousRound();
    return this.update({turn: this.turn - 1});
  }

  /* -------------------------------------------- */

  /**
   * Advance the combat to the next round
   * @return {Promise}
   */
  async nextRound() {
    let turn = 0;
    if ( this.settings.skipDefeated ) {
      turn = this.turns.findIndex(t => !t.defeated);
      if (turn === -1) {
        ui.notifications.warn(game.i18n.localize("COMBAT.NoneRemaining"));
        turn = 0;
      }
    }
    return this.update({round: this.round+1, turn: turn});
  }

  /* -------------------------------------------- */

  /**
   * Rewind the combat to the previous round
   * @return {Promise}
   */
  async previousRound() {
    let turn = ( this.round === 0 ) ? 0 : this.turns.length - 1;
    return this.update({round: Math.max(this.round - 1, 0), turn: turn});
  }

  /* -------------------------------------------- */

  /**
   * Reset all combatant initiative scores, setting the turn back to zero
   * @return {Promise}
   */
  async resetAll() {
    const updates = this.data.combatants.map(c => { return {
      _id: c._id,
      initiative: null,
      initDice:[]
    }});
    await this.updateEmbeddedEntity("Combatant", updates);
    return this.update({turn: 0});
  }

  /* -------------------------------------------- */

  /**
   * Display a dialog querying the GM whether they wish to end the combat encounter and empty the tracker
   * @return {Promise}
   */
  async endCombat() {
    return Dialog.confirm({
      title: "End Combat Encounter?",
      content: "<p>End this combat encounter and empty the turn tracker?</p>",
      yes: () => this.delete()
    });
  }

  /* -------------------------------------------- */
  /*  Combatant Management Methods                */
  /* -------------------------------------------- */

  /** @extends {Entity.getEmbeddedEntity} */
  getCombatant(id) {
    return this.getEmbeddedEntity("Combatant", id);
  }

  /* -------------------------------------------- */

  /**
   * Get a Combatant using its Token id
   * {string} tokenId   The id of the Token for which to acquire the combatant
   */
  getCombatantByToken(tokenId) {
    return this.turns.find(c => c.tokenId === tokenId);
  }

  /* -------------------------------------------- */

  /**
   * Set initiative for a single Combatant within the Combat encounter.
   * Turns will be updated to keep the same combatant as current in the turn order
   * @param {string} id         The combatant ID for which to set initiative
   * @param {Number} value      A specific initiative value to set
   */
  async setInitiative(id, value) {
    const currentId = this.combatant._id;
    await this.updateCombatant({_id: id, initiative: value}, {});
    await this.update({turn: this.turns.findIndex(c => c._id === currentId)});
  }

  /* -------------------------------------------- */

  /**
   * Roll initiative for one or multiple Combatants within the Combat entity
   * @param {Array|string} ids        A Combatant id or Array of ids for which to roll
   * @param {string|null} formula     A non-default initiative formula to roll. Otherwise the system default is used.
   * @param {Object} messageOptions   Additional options with which to customize created Chat Messages
   * @return {Promise.<Combat>}       A promise which resolves to the updated Combat entity once updates are complete.
   */
  async rollInitiative(ids, formula=null, messageOptions={}) {

    // Structure input data
    ids = typeof ids === "string" ? [ids] : ids;
    const currentId = this.combatant._id;

    // Iterate over Combatants, performing an initiative roll for each
    const [updates, messages] = ids.reduce((results, id, i) => {
      let [updates, messages] = results;

      // Get Combatant data
      const c = this.getCombatant(id);
      if ( !c || !c.owner ) return results;

      // Roll initiative
      const cf = formula || this._getInitiativeFormula(c);
      const roll = this._getInitiativeRoll(c, cf);
      updates.push({_id: id, initiative: roll.total});

      // Determine the roll mode
      let rollMode = messageOptions.rollMode || game.settings.get("core", "rollMode");
      if (( c.token.hidden || c.hidden ) && (rollMode === "roll") ) rollMode = "gmroll";

      // Construct chat message data
      let messageData = mergeObject({
        speaker: {
          scene: canvas.scene._id,
          actor: c.actor ? c.actor._id : null,
          token: c.token._id,
          alias: c.token.name
        },
        flavor: `${c.token.name} rolls for Initiative!`
      }, messageOptions);
      const chatData = roll.toMessage(messageData, {rollMode, create:false});
      if ( i > 0 ) chatData.sound = null;   // Only play 1 sound for the whole set
      messages.push(chatData);

      // Return the Roll and the chat data
      return results;
    }, [[], []]);
    if ( !updates.length ) return this;

    // Update multiple combatants
    await this.updateEmbeddedEntity("Combatant", updates);

    // Ensure the turn order remains with the same combatant
    await this.update({turn: this.turns.findIndex(t => t._id === currentId)});

    // Create multiple chat messages
    await CONFIG.ChatMessage.entityClass.create(messages);

    // Return the updated Combat
    return this;
  }

  /* -------------------------------------------- */

  /**
   * Acquire the default dice formula which should be used to roll initiative for a particular combatant.
   * Modules or systems could choose to override or extend this to accommodate special situations.
   * @private
   *
   * @param {Object} combatant      Data for the specific combatant for whom to acquire an initiative formula. This
   *                                is not used by default, but provided to give flexibility for modules and systems.
   * @return {string}               The initiative formula to use for this combatant.
   */
  _getInitiativeFormula(combatant) {
    return CONFIG.Combat.initiative.formula || game.system.data.initiative;
  }

  /* -------------------------------------------- */

  /**
   * Get a Roll object which represents the initiative roll for a given combatant.
   * @private
   * @param {Object} combatant      Data for the specific combatant for whom to acquire an initiative formula. This
   *                                is not used by default, but provided to give flexibility for modules and systems.
   * @param {string} [formula]      An explicit Roll formula to use for the combatant.
   * @return {Roll}                 The Roll instance to use for the combatant.
   */
  _getInitiativeRoll(combatant, formula) {
    const rollData = combatant.actor ? combatant.actor.getRollData() : {};
    return new Roll(formula, rollData).roll();
  }

  /* -------------------------------------------- */

  /**
   * Roll initiative for all non-player actors who have not already rolled
   * @param {...*}  args    Additional arguments forwarded to the Combat.rollInitiative method
   */
  async rollNPC(...args) {
    const npcs = this.turns.filter(t => (!t.actor || !t.players.length) && !t.initiative);
    return this.rollInitiative(npcs.map(t => t._id), ...args);
  }

  /* -------------------------------------------- */

  /**
   * Roll initiative for all combatants which have not already rolled
   * @param {...*} args     Additional arguments forwarded to the Combat.rollInitiative method
   */
  async rollAll(...args) {
    const unrolled = this.turns.filter(t => t.owner && !t.initiative);
    return this.rollInitiative(unrolled.map(t => t._id), ...args);
  }

  /* -------------------------------------------- */

  /** @extends {Entity.createEmbeddedEntity} */
  async createCombatant(data, options) {
    return this.createEmbeddedEntity("Combatant", data, options);
  }

  /* -------------------------------------------- */

  /** @extends {Entity.updateEmbeddedEntity} */
  async updateCombatant(data, options) {
    return this.updateEmbeddedEntity("Combatant", data, options);
  }

  /* -------------------------------------------- */

  /** @extends {Entity.deleteEmbeddedEntity} */
  async deleteCombatant(id, options) {
    return this.deleteEmbeddedEntity("Combatant", id, options);
  }

  /* -------------------------------------------- */
  /*  Socket Events and Handlers
  /* -------------------------------------------- */

  /** @override */
  _onCreate(...args) {
    if ( !this.collection.viewed ) ui.combat.initialize({combat: this});
  }

  /* -------------------------------------------- */

  /** @override */
	_onUpdate(data, ...args) {
	  super._onUpdate(data, ...args);

	  // Update state tracking
    this.previous = this.current;
    let c = this.combatant;
    this.current = {round: this.data.round, turn: this.data.turn, tokenId: c ? c.tokenId : null};

	  // If the Combat was set as active, initialize the sidebar
    if ( (data.active === true) && ( this.data.scene === game.scenes.viewed._id ) ) {
      ui.combat.initialize({combat: this});
    }

    // Render the sidebar
    if ( ["combatants", "round", "turn"].some(k => data.hasOwnProperty(k)) ) {
      if ( data.combatants ) this.setupTurns();
      ui.combat.scrollToTurn();
    }
  }

  /* -------------------------------------------- */

  /** @override */
  _onDelete(...args) {
    if ( this.collection.viewed === this ) ui.combat.initialize();
  }

  /* -------------------------------------------- */

  /** @override */
  _onDeleteEmbeddedEntity(embeddedName, child, options, userId) {
    super._onDeleteEmbeddedEntity(embeddedName, child, options, userId);
    const deletedTurn = this.turns.findIndex(t => t._id === child._id);
    if ( deletedTurn <= this.turn ) return this.update({turn: this.turn - 1});
  }

  /* -------------------------------------------- */

  /** @override */
  _onModifyEmbeddedEntity(...args) {
    this.setupTurns();
    if ( this === this.collection.viewed ) this.collection.render();
  }
}
Combat.CONFIG_SETTING = "combatTrackerConfig";
