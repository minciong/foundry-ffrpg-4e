import { FFCombatTrackerConfig } from "./combat-tracker-config.js";
export class FFCombatTracker extends SidebarTab {
  constructor(options) {
    super(options);
    if ( !this.popOut ) game.combats.apps.push(this);

    /**
     * Record a reference to the currently highlighted Token
     * @type {Token|null}
     * @private
     */
    this._highlighted = null;

    /**
     * Record the currently tracked Combat encounter
     * @type {Combat|null}
     */
    this.combat = null;

    /**
     * Cache the values of additional tracked resources for each Token in Combat
     * @type {Object}
     */
    this.trackedResources = {};

    // Initialize the starting encounter
    this.initialize({render: false});
  }

  /* -------------------------------------------- */

  /** @override */
	static get defaultOptions() {
	  return mergeObject(super.defaultOptions, {
      id: "combat",
      template: "systems/ffrpg4e/templates/combat/combat-tracker.html",
      title: "Combat Tracker",
      scrollY: [".directory-list"]
    });
  }

	/* -------------------------------------------- */
	/*  Methods
	/* -------------------------------------------- */

	/** @override */
	createPopout() {
    const pop = super.createPopout();
    pop.initialize({combat: this.combat, render: true});
    return pop;
	}

	/* -------------------------------------------- */

  /**
   * Initialize the combat tracker to display a specific combat encounter.
   * If no encounter is provided, the tracker will be initialized with the first encounter in the viewed scene.
   * @param {Combat|null} combat    The combat encounter to initialize
   * @param {boolean} render        Whether to re-render the sidebar after initialization
   */
	initialize({combat=null, render=true}={}) {

	  // Retrieve a default encounter if none was provided
    if ( combat === null ) {
      const view = game.scenes.viewed;
      const combats = view ? game.combats.entities.filter(c => c.data.scene === view._id) : [];
      combat = combats.length ? combats.find(c => c.data.active) || combats[0] : null;
    }

    // Assign data
    this._highlighted = null;
    this.combat = combat;

    // Trigger data computation
    if ( combat && !combat.turns ) combat.turns = combat.setupTurns();
    this.updateTrackedResources();

    // Also initialize the popout
    if ( this._popout ) this._popout.initialize({combat, render: false});

    // Render the tracker
    if ( render ) this.render();
  }

	/* -------------------------------------------- */

  /**
   * Update the value of tracked resources which are reported for each combatant
   * @return {Object}
   */
  updateTrackedResources() {
    const combat = this.combat;
    if ( !combat ) return this.trackedResources = {};
    const resources = [combat.settings.resource,combat.settings.thing];    // For future tracking of multiple resources
    console.log("tracked", resources)
    //tracked resource = object {turns{resources}}
    //obj["objid"]={resource[r], resource[r]}
    this.trackedResources = combat.turns.reduce((obj, t) => {
      const token = new Token(t.token);
      let obs = t.actor && t.actor.hasPerm(game.user, "OBSERVER");
      obj[token.id] = resources.reduce((res, r) => {
        res[r] = obs && t.actor ? getProperty(token.actor.data.data, r) : null;
        return res;
      }, {});
      console.log("obj",t)
      return obj;
    }, {});
    console.log("r", this.trackedResources)
    // Synchronize updates with the pop-out tracker
    if ( this._popout ) this._popout.trackedResources = this.trackedResources;
    return this.trackedResources;
  }

  /* -------------------------------------------- */

  /**
   * Scroll the combat log container to ensure the current Combatant turn is centered vertically
   */
  scrollToTurn() {
    const combat = this.combat;
    if ( !combat ) return;
    let active = this.element.find(".active")[0];
    if ( !active ) return;
    let container = active.parentElement;
    const nViewable = Math.floor(container.offsetHeight / active.offsetHeight);
    container.scrollTop = (this.combat.turn * active.offsetHeight) - ((nViewable/2) * active.offsetHeight);
  }

  /* -------------------------------------------- */

  /** @override */
  async getData(options) {

    // Get the combat encounters possible for the viewed Scene
    const combat = this.combat;
    const hasCombat = combat !== null;
    const view = canvas.scene;
    const combats = view ? game.combats.entities.filter(c => c.data.scene === view._id) : [];
    const currentIdx = combats.findIndex(c => c === this.combat);
    const previousId = currentIdx > 0 ? combats[currentIdx-1].id : null;
    const nextId = currentIdx < combats.length - 1 ? combats[currentIdx+1].id : null;
    const settings = game.settings.get("core", Combat.CONFIG_SETTING);

    // Prepare rendering data
    const data = {
      user: game.user,
      combats: combats,
      currentIndex: currentIdx + 1,
      combatCount: combats.length,
      hasCombat: hasCombat,
      combat,
      turns: [],
      previousId,
      nextId,
      started: this.started,
      control: false,
      settings
    };
    if ( !hasCombat ) return data;

    // Add active combat data
    const combatant = combat.combatant;
    const hasControl = combatant && combatant.players && combatant.players.includes(game.user);
    // Update data for combatant turns
    const decimals = CONFIG.Combat.initiative.decimals;
    console.log("turns",combat.turns)
    const turns = [];
    for ( let [i, t] of combat.turns.entries() ) {
      if ( !t.visible ) continue;
      // Name and Image
      t.name = t.token.name || t.actor.name;
      if ( t.defeated ) t.img = CONFIG.controlIcons.defeated;
      else if ( VideoHelper.hasVideoExtension(t.token.img) ) {
        t.img = await game.video.createThumbnail(t.token.img, {width: 100, height: 100});
      }
      else t.img = t.token.img || t.actor.img;

      // Turn order and initiative
      t.active = i === combat.turn;
      t.initiative = isNaN(parseFloat(t.initiative)) ? null : Number(t.initiative).toFixed(decimals);
      t.hasRolled = t.initiative !== null;

      // Styling rules
      t.css = [
        t.active ? "active" : "",
        t.hidden ? "hidden" : "",
        t.defeated ? "defeated" : ""
      ].join(" ").trim();

      // Tracked resources
      t.resource = this.trackedResources[t.tokenId][settings.resource];
      t.thing = this.trackedResources[t.tokenId][settings.thing];
      t.actor.initDice=t.initDice
      // t.arrtest=t.arrtest.sort(function(a, b){return a-b});
      turns.push(t);
    }
    console.log("t",turns)

    // Merge update data for rendering
    return mergeObject(data, {
      round: combat.data.round,
      turn: combat.data.turn,
      turns: turns,
      control: hasControl
    });
  }

  /* -------------------------------------------- */

  /** @override */
	activateListeners(html) {
	  super.activateListeners(html);
	  const tracker = html.find("#combat-tracker");
	  const combatants = tracker.find(".combatant");

	  // Create new Combat encounter
    html.find('.combat-create').click(ev => this._onCombatCreate(ev));

    // Display Combat settings
    html.find('.combat-settings').click(ev => {
      ev.preventDefault();
      new FFCombatTrackerConfig().render(true);
    });

    // Cycle the current Combat encounter
    html.find('.combat-cycle').click(ev => this._onCombatCycle(ev));

	  // Combat control
    html.find('.combat-control').click(ev => this._onCombatControl(ev));

    // Combatant control
    html.find('.combatant-control').click(ev => this._onCombatantControl(ev));

    // Hover on Combatant
    combatants.hover(this._onCombatantHover.bind(this), this._onCombatantHoverOut.bind(this));

    // Click on Combatant
    combatants.click(this._onCombatantMouseDown.bind(this));

    // Context on right-click
    if ( game.user.isGM ) this._contextMenu(html);

    // Intersection Observer for Combatant avatars
    const observer = new IntersectionObserver(this._onLazyLoadImage.bind(this), { root: tracker[0] });
    combatants.each((i, li) => observer.observe(li));
  }

  /* -------------------------------------------- */

  /**
   * Handle new Combat creation request
   * @param {Event} event
   * @private
   */
  async _onCombatCreate(event) {
    event.preventDefault();
    let scene = game.scenes.viewed;
    if ( !scene ) return;
    let cbt = await game.combats.object.create({scene: scene._id});
    await cbt.activate();
    this.initialize(cbt);
  }

  /* -------------------------------------------- */

  /**
   * Handle a Combat deletion request
   * @param {Event} event
   * @private
   */
  async _onCombatDelete(event) {
    event.preventDefault();
    let btn = event.currentTarget;
    if ( btn.hasAttribute("disabled") ) return;
    let cbt = game.combats.get(btn.getAttribute("data-combat-id"));
    await cbt.delete();
  }

  /* -------------------------------------------- */

  /**
   * Handle a Combat cycle request
   * @param {Event} event
   * @private
   */
  async _onCombatCycle(event) {
    event.preventDefault();
    let btn = event.currentTarget,
        combatId = btn.getAttribute("data-combat-id");
    if ( !combatId ) return;
    const combat = game.combats.get(combatId);
    await combat.activate();
    this.initialize(combat);
  }

  /* -------------------------------------------- */

  /**
   * Handle click events on Combat control buttons
   * @private
   * @param {Event} event   The originating mousedown event
   */
  async _onCombatControl(event) {
    event.preventDefault();
    const ctrl = event.currentTarget;
    if ( ctrl.getAttribute("disabled") ) return;
    else ctrl.setAttribute("disabled", true);
    const fn = this.combat[ctrl.dataset.control];
    if ( fn ) await fn.bind(this.combat)();
    ctrl.removeAttribute("disabled");
  }

  /* -------------------------------------------- */

  /**
   * Handle a Combatant control toggle
   * @private
   * @param {Event} event   The originating mousedown event
   */
  async _onCombatantControl(event) {
    event.preventDefault();
    event.stopPropagation();
    const btn = event.currentTarget;
    const li = btn.closest(".combatant");
    const c = this.combat.getCombatant(li.dataset.combatantId);

    // Switch control action
    switch (btn.dataset.control) {

      // Toggle combatant visibility
      case "toggleHidden":
        await this.combat.updateCombatant({_id: c._id, hidden: !c.hidden});
        break;

      // Toggle combatant defeated flag
      case "toggleDefeated":
        let isDefeated = !c.defeated;
        await this.combat.updateCombatant({_id: c._id, defeated: isDefeated});
        const token = canvas.tokens.get(c.tokenId);
        if ( token ) {
          if ( isDefeated && !token.data.overlayEffect ) token.toggleOverlay(CONFIG.controlIcons.defeated);
          else if ( !isDefeated && token.data.overlayEffect === CONFIG.controlIcons.defeated ) token.toggleOverlay(null);
        }
        break;

      // Roll combatant initiative
      case "rollInitiative":
        await this.combat.rollInitiative([c._id]);
        break;
    }

    // Render tracker updates
    this.render();
  }

  /* -------------------------------------------- */

  /**
   * Handle mouse-down event on a combatant name in the tracker
   * @private
   * @param {Event} event   The originating mousedown event
   * @return {Promise}      A Promise that resolves once the pan is complete
   */
  _onCombatantMouseDown(event) {
    event.preventDefault();

    const li = event.currentTarget;
    const token = canvas.tokens.get(li.dataset.tokenId);
    if ( !token.owner ) return;
    const now = Date.now();

    // Handle double-left click to open sheet
    const dt = now - this._clickTime;
    this._clickTime = now;
    if ( dt <= 250 ) {
      if ( token.actor ) token.actor.sheet.render(true);
    }

    // Control and pan on single-left
    else {
      token.control({releaseOthers: true});
      return canvas.animatePan({x: token.x, y: token.y});
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle mouse-hover events on a combatant in the tracker
   * @private
   */
  _onCombatantHover(event) {
    event.preventDefault();
    const li = event.currentTarget;
    const token = canvas.tokens.get(li.dataset.tokenId);
    if ( token && token.isVisible ) {
      if ( !token._controlled ) token._onHoverIn(event);
      this._highlighted = token;
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle mouse-unhover events for a combatant in the tracker
   * @private
   */
  _onCombatantHoverOut(event) {
    event.preventDefault();
    if ( this._highlighted ) this._highlighted._onHoverOut(event);
    this._highlighted = null;
  }

  /* -------------------------------------------- */

  /**
   * Default folder context actions
   * @param html {jQuery}
   * @private
   */
  _contextMenu(html) {
    const entryOptions = this._getEntryContextOptions();
    Hooks.call(`get${this.constructor.name}EntryContext`, html, entryOptions);
    if (entryOptions) new ContextMenu(html, ".directory-item", entryOptions);
  }

  /* -------------------------------------------- */

  /**
   * Get the sidebar directory entry context options
   * @return {Object}   The sidebar entry context options
   * @private
   */
  _getEntryContextOptions() {
    return [
      {
        name: "Modify",
        icon: '<i class="fas fa-edit"></i>',
        callback: li => this._showModifyCombatantInitiativeContext(li)
      },
      {
        name: "Reroll",
        icon: '<i class="fas fa-dice-d20"></i>',
        callback: li => this.combat.rollInitiative(li.data('combatant-id'))
      },
      {
        name: "Remove",
        icon: '<i class="fas fa-skull"></i>',
        callback: li => this.combat.deleteCombatant(li.data('combatant-id'))
      }
    ];
  }

  /* -------------------------------------------- */

  /**
   * Display a dialog which prompts the user to enter a new initiative value for a Combatant
   * @param {jQuery} li
   * @private
   */
  _showModifyCombatantInitiativeContext(li) {
    const combatant = this.combat.getCombatant(li.data('combatant-id'));
    new Dialog({
      title: `Modify ${combatant.name} Initiative`,
      content: `<div class="form-group">
                  <label>Initiative Value</label>
                  <input name="initiative" value="${combatant.initiative || ""}" placeholder="Value"/>
                </div>`,
      buttons: {
        set: {
          icon: '<i class="fas fa-dice-d20"></i>',
          label: "Modify Roll",
          callback: html => {
            let init = parseFloat(html.find('input[name="initiative"]').val());
            this.combat.setInitiative(combatant._id, Math.round(init * 100) / 100);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel"
        }
      },
      default: "set"
    }, {
      top: Math.min(li[0].offsetTop, window.innerHeight - 350),
      left: window.innerWidth - 720,
      width: 400
    }).render(true);
  }
}
