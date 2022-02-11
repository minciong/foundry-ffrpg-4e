import { FFCombatTrackerConfig } from "./combat-tracker-config.js";
import { FFCombatantConfig } from "./combatant-config.js";

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
    this.viewed = null;

    // Initialize the starting encounter
    this.initialize({render: false});
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
	static get defaultOptions() {
	  return foundry.utils.mergeObject(super.defaultOptions, {
      id: "combat",
      template: "systems/ffrpg4e/templates/combat/combat-tracker.html",
      title: "COMBAT.SidebarTitle",
      scrollY: [".directory-list"]
    });
  }

	/* -------------------------------------------- */

  /**
   * Return an array of Combat encounters which occur within the current Scene.
   * @type {Combat[]}
   */
  get combats() {
    return game.combats.combats;
  }

	/* -------------------------------------------- */
	/*  Methods
	/* -------------------------------------------- */

	/** @inheritdoc */
	createPopout() {
    const pop = super.createPopout();
    pop.initialize({combat: this.viewed, render: true});
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
      const combats = this.combats;
      combat = combats.length ? combats.find(c => c.data.active) || combats[0] : null;
    }

    // Set flags
    this.viewed = combat;
    this._highlighted = null;

    // Trigger data computation
    if ( combat && !combat.turns ) combat.turns = combat.setupTurns();

    // Also initialize the popout
    if ( this._popout ) this._popout.initialize({combat, render: false});

    // Render the tracker
    if ( render ) this.render();
  }

  /* -------------------------------------------- */

  /**
   * Scroll the combat log container to ensure the current Combatant turn is centered vertically
   */
  scrollToTurn() {
    const combat = this.viewed;
    if ( !combat || (combat.turn === null) ) return;
    let active = this.element.find(".active")[0];
    if ( !active ) return;
    let container = active.parentElement;
    const nViewable = Math.floor(container.offsetHeight / active.offsetHeight);
    container.scrollTop = (combat.turn * active.offsetHeight) - ((nViewable/2) * active.offsetHeight);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async getData(options) {

    // Get the combat encounters possible for the viewed Scene
    const combat = this.viewed;
    const hasCombat = combat !== null;
    const combats = this.combats;
    const currentIdx = combats.findIndex(c => c === combat);
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
      settings,
      linked: combat?.data.scene !== null,
      labels: {}
    };
    data.labels.scope = game.i18n.localize(`COMBAT.${data.linked ? "Linked" : "Unlinked"}`);
    if ( !hasCombat ) return data;

    // Format information about each combatant in the encounter
    let hasDecimals = false;
    const turns = [];
    for ( let [i, combatant] of combat.turns.entries() ) {
      if ( !combatant.visible ) continue;

      // Prepare turn data
      const resource = combatant.permission >= CONST.DOCUMENT_PERMISSION_LEVELS.OBSERVER ? combatant.resource : null
      
      const turn = {
        id: combatant.id,
        name: combatant.name,
        img: combatant.img,
        active: i === combat.turn,
        owner: combatant.isOwner,
        defeated: combatant.data.defeated,
        hidden: combatant.hidden,
        initiative: combatant.initiative,
        initDice: combatant.data.flags.initDice,
        hasRolled: combatant.initiative !== null,
        hasResource: resource !== null,
        resource: resource
      };
      if ( Number.isFinite(turn.initiative) && !Number.isInteger(turn.initiative) ) hasDecimals = true;
      turn.css = [
        turn.active ? "active" : "",
        turn.hidden ? "hidden" : "",
        turn.defeated ? "defeated" : ""
      ].join(" ").trim();

      // Cached thumbnail image for video tokens
      if ( VideoHelper.hasVideoExtension(turn.img) ) {
        if ( combatant._thumb ) turn.img = combatant._thumb;
        else turn.img = combatant._thumb = await game.video.createThumbnail(combatant.img, {width: 100, height: 100});
      }

      // Actor and Token status effects
      turn.effects = new Set();
      if ( combatant.token ) {
        combatant.token.data.effects.forEach(e => turn.effects.add(e));
        if ( combatant.token.data.overlayEffect ) turn.effects.add(combatant.token.data.overlayEffect);
      }
      if ( combatant.actor ) combatant.actor.temporaryEffects.forEach(e => {
        if ( e.getFlag("core", "statusId") === CONFIG.Combat.defeatedStatusId ) turn.defeated = true;
        else if ( e.data.icon ) turn.effects.add(e.data.icon);
      });
      turns.push(turn);
    }

    // Format initiative numeric precision
    const precision = CONFIG.Combat.initiative.decimals;
    turns.forEach(t => {
      if ( t.initiative !== null ) t.initiative = t.initiative.toFixed(hasDecimals ? precision : 0);
    });

    // Merge update data for rendering
    return foundry.utils.mergeObject(data, {
      round: combat.data.round,
      turn: combat.data.turn,
      turns: turns,
      control: combat.combatant?.players?.includes(game.user)
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
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
    combatants.hover(this._onCombatantHoverIn.bind(this), this._onCombatantHoverOut.bind(this));

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
    let scene = game.scenes.current;
    const cls = getDocumentClass("Combat");
    const combat = await cls.create({scene: scene?.id});
    await combat.activate({render: false});
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
    const btn = event.currentTarget;
    const combat = game.combats.get(btn.dataset.combatId);
    if ( !combat ) return;
    await combat.activate({render: false});
  }

  /* -------------------------------------------- */

  /**
   * Handle click events on Combat control buttons
   * @private
   * @param {Event} event   The originating mousedown event
   */
  async _onCombatControl(event) {
    event.preventDefault();
    const combat = this.viewed;
    const ctrl = event.currentTarget;
    if ( ctrl.getAttribute("disabled") ) return;
    else ctrl.setAttribute("disabled", true);
    const fn = combat[ctrl.dataset.control];
    if ( fn ) await fn.bind(combat)();
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
    const combat = this.viewed;
    const c = combat.combatants.get(li.dataset.combatantId);

    // Switch control action
    switch (btn.dataset.control) {

      // Toggle combatant visibility
      case "toggleHidden":
        return c.update({hidden: !c.hidden});

      // Toggle combatant defeated flag
      case "toggleDefeated":
        return this._onToggleDefeatedStatus(c);

      // Roll combatant initiative
      case "rollInitiative":
        return combat.rollInitiative([c.id]);
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle toggling the defeated status effect on a combatant Token
   * @param {Combatant} combatant     The combatant data being modified
   * @return {Promise}                A Promise that resolves after all operations are complete
   * @private
   */
  async _onToggleDefeatedStatus(combatant) {
    const isDefeated = !combatant.isDefeated;
    await combatant.update({defeated: isDefeated});
    const token = combatant.token;
    if ( !token ) return;
    // Push the defeated status to the token
    const status = CONFIG.statusEffects.find(e => e.id === CONFIG.Combat.defeatedStatusId);
    if ( !status && !token.object ) return;
    const effect = token.actor && status ? status : CONFIG.controlIcons.defeated;
    if ( token.object ) await token.object.toggleEffect(effect, {overlay: true, active: isDefeated});
    else await token.toggleActiveEffect(effect, {overlay: true, active: isDefeated});
  }

  /* -------------------------------------------- */

  /**
   * Handle mouse-down event on a combatant name in the tracker
   * @param {Event} event   The originating mousedown event
   * @return {Promise}      A Promise that resolves once the pan is complete
   * @private
   */
  async _onCombatantMouseDown(event) {
    event.preventDefault();

    const li = event.currentTarget;
    const combatant = this.viewed.combatants.get(li.dataset.combatantId);
    const token = combatant.token;
    if ( !combatant.actor?.testUserPermission(game.user, "OBSERVED") ) return;
    const now = Date.now();

    // Handle double-left click to open sheet
    const dt = now - this._clickTime;
    this._clickTime = now;
    if ( dt <= 250 ) return combatant.actor?.sheet.render(true);

    // Control and pan to Token object
    if ( token?.object ) {
      token.object?.control({releaseOthers: true});
      return canvas.animatePan({x: token.data.x, y: token.data.y});
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle mouse-hover events on a combatant in the tracker
   * @private
   */
  _onCombatantHoverIn(event) {
    event.preventDefault();
    if ( !canvas.ready ) return;
    const li = event.currentTarget;
    const combatant = this.viewed.combatants.get(li.dataset.combatantId);
    const token = combatant.token?.object;
    if ( token?.isVisible ) {
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
   * Highlight a hovered combatant in the tracker.
   * @param {Combatant} combatant The Combatant
   * @param {boolean} hover       Whether they are being hovered in or out.
   * @param hover
   */
  hoverCombatant(combatant, hover) {
    const trackers = [this.element[0]];
    if ( this._popout ) trackers.push(this._popout.element[0]);
    for ( const tracker of trackers ) {
      const li = tracker.querySelector(`.combatant[data-combatant-id="${combatant.id}"]`);
      if ( !li ) continue;
      if ( hover ) li.classList.add("hover");
      else li.classList.remove("hover");
    }
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _contextMenu(html) {
    ContextMenu.create(this, html, ".directory-item", this._getEntryContextOptions());
  }

  /* -------------------------------------------- */

  /**
   * Get the Combatant entry context options
   * @return {object[]}   The Combatant entry context options
   * @private
   */
  _getEntryContextOptions() {
    return [
      {
        name: "COMBAT.CombatantUpdate",
        icon: '<i class="fas fa-edit"></i>',
        callback: this._onConfigureCombatant.bind(this)
      },
      {
        name: "COMBAT.CombatantClear",
        icon: '<i class="fas fa-undo"></i>',
        condition: li => {
          const combatant = this.viewed.combatants.get(li.data("combatant-id"));
          return combatant?.data?.initiative ?? false;
        },
        callback: li => {
          const combatant = this.viewed.combatants.get(li.data("combatant-id"));
          if ( combatant ) return combatant.update({initiative: null});
        }
      },
      {
        name: "COMBAT.CombatantReroll",
        icon: '<i class="fas fa-dice-d20"></i>',
        callback: li => {
          const combatant = this.viewed.combatants.get(li.data("combatant-id"));
          if ( combatant ) return this.viewed.rollInitiative([combatant.id]);
        }
      },
      {
        name: "COMBAT.CombatantRemove",
        icon: '<i class="fas fa-trash"></i>',
        callback: li => {
          const combatant = this.viewed.combatants.get(li.data("combatant-id"));
          if ( combatant ) return combatant.delete();
        }
      }
    ];
  }

  /* -------------------------------------------- */

  /**
   * Display a dialog which prompts the user to enter a new initiative value for a Combatant
   * @param {jQuery} li
   * @private
   */
  _onConfigureCombatant(li) {
    const combatant = this.viewed.combatants.get(li.data('combatant-id'));
    new FFCombatantConfig(combatant, {
      top: Math.min(li[0].offsetTop, window.innerHeight - 350),
      left: window.innerWidth - 720,
      width: 400
    }).render(true);
  }
}
