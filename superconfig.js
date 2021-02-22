const CONFIG = {

  /**
   * Configure debugging flags to display additional information
   */
  debug: {
    hooks: false,
    sight: false,
    av: false,
    avclient: false,
    mouseInteraction: false
  },

  /**
   * Configuration for the default Actor entity class
   */
  Actor: {
    entityClass: Actor,
    collection: Actors,
    sheetClasses: {},
    sidebarIcon: "fas fa-user"
  },

  /**
   * Configuration settings for the Canvas and its contained layers and objects
   * @type {Object}
   */
  Canvas: {
    darknessColor: 0x110033,
    normalLightColor: 0xFFFEFE,
    maxZoom: 3.0
  },

  /**
   * Configuration for the ChatMessage entity
   */
  ChatMessage: {
    entityClass: ChatMessage,
    collection: Messages,
    template: "templates/sidebar/chat-message.html",
    sidebarIcon: "fas fa-comments",
    batchSize: 100
  },

  /**
   * Configuration for the Combat entity
   */
  Combat: {
    entityClass: Combat,
    collection: CombatEncounters,
    sidebarIcon: "fas fa-fist-raised",
    initiative: {
      formula: null,
      decimals: 0
    }
  },

  /**
   * Configuration for dice rolling behaviors in the Foundry VTT client
   * @type {Object}
   */
  Dice: {
    types: [Die, FateDie],
    template: "templates/dice/roll.html",
    tooltip: "templates/dice/tooltip.html",
    mathProxy: new Proxy(Math, {has: () => true, get: (t, k) => k === Symbol.unscopables ? undefined : t[k]}),
    rollModes: Object.entries(CONST.DICE_ROLL_MODES).reduce((obj, e) => {
      let [k, v] = e;
      obj[v] = `CHAT.Roll${k.titleCase()}`;
      return obj;
    }, {})
  },

  /**
   * Configuration for the Folder entity
   */
  Folder: {
    entityClass: Folder,
    sheetClass: FolderConfig
  },

  /**
   * Configuration for the default Item entity class
   */
  Item: {
    entityClass: Item,
    collection: Items,
    sheetClass: ItemSheet,
    sheetClasses: {},
    sidebarIcon: "fas fa-suitcase"
  },

  /**
   * Configuration for the JournalEntry entity
   */
  JournalEntry: {
    entityClass: JournalEntry,
    collection: Journal,
    sheetClass: JournalSheet,
    noteIcons: {
      "Anchor": "icons/svg/anchor.svg",
      "Barrel": "icons/svg/barrel.svg",
      "Book": "icons/svg/book.svg",
      "Bridge": "icons/svg/bridge.svg",
      "Cave": "icons/svg/cave.svg",
      "Castle": "icons/svg/castle.svg",
      "Chest": "icons/svg/chest.svg",
      "City": "icons/svg/city.svg",
      "Coins": "icons/svg/coins.svg",
      "Fire": "icons/svg/fire.svg",
      "Hanging Sign": "icons/svg/hanging-sign.svg",
      "House": "icons/svg/house.svg",
      "Mountain": "icons/svg/mountain.svg",
      "Oak Tree": "icons/svg/oak.svg",
      "Obelisk": "icons/svg/obelisk.svg",
      "Pawprint": "icons/svg/pawprint.svg",
      "Ruins": "icons/svg/ruins.svg",
      "Tankard": "icons/svg/tankard.svg",
      "Temple": "icons/svg/temple.svg",
      "Tower": "icons/svg/tower.svg",
      "Trap": "icons/svg/trap.svg",
      "Skull": "icons/svg/skull.svg",
      "Statue": "icons/svg/statue.svg",
      "Sword": "icons/svg/sword.svg",
      "Village": "icons/svg/village.svg",
      "Waterfall": "icons/svg/waterfall.svg",
      "Windmill": "icons/svg/windmill.svg"
    },
    sidebarIcon: "fas fa-book-open"
  },

  /**
   * Configuration for the Macro entity
   */
  Macro: {
    entityClass: Macro,
    collection: Macros,
    sheetClass: MacroConfig,
    sidebarIcon: "fas fa-terminal"
  },

  /**
   * Configuration for MeasuredTemplate settings and options
   */
  MeasuredTemplate: {
    types: {
      "circle": "Circle",
      "cone": "Cone",
      "rect": "Rectangle",
      "ray": "Ray"
    }
  },

  /**
   * Configuration for the default Playlist entity class
   */
  Playlist: {
    entityClass: Playlist,
    collection: Playlists,
    sheetClass: null,
    sidebarIcon: "fas fa-music"
  },

  /**
   * Configuration for RollTable random draws
   */
  RollTable: {
    entityClass: RollTable,
    collection: RollTables,
    sheetClass: RollTableConfig,
    sidebarIcon: "fas fa-th-list",
    resultIcon: "icons/svg/d20-black.svg",
    resultTemplate: "templates/dice/table-result.html"
  },

  /**
   * Configuration for the default Scene entity class
   */
  Scene: {
    entityClass: Scene,
    collection: Scenes,
    sheetClass: SceneConfig,
    sidebarIcon: "fas fa-map"
  },

  /**
   * Configuration for the User entity, it's roles, and permissions
   */
  User: {
    entityClass: User,
    collection: Users,
    sheetClass: PlayerConfig,
    permissions: Users.permissions
  },

  /**
   * Configure the default Token text style so that it may be reused and overridden by modules
   * @type {PIXI.TextStyle}
   */
  canvasTextStyle: new PIXI.TextStyle({
    fontFamily: "Signika",
    fontSize: 36,
    fill: "#FFFFFF",
    stroke: '#111111',
    strokeThickness: 1,
    dropShadow: true,
    dropShadowColor: "#000000",
    dropShadowBlur: 4,
    dropShadowAngle: 0,
    dropShadowDistance: 0,
    align: "center",
    wordWrap: false
  }),

  /**
   * The control icons used for rendering common HUD operations
   * @type {Object}
   */
  controlIcons: {
    combat: "icons/svg/combat.svg",
    visibility: "icons/svg/cowled.svg",
    effects: "icons/svg/aura.svg",
    lock: "icons/svg/padlock.svg",
    up: "icons/svg/up.svg",
    down: "icons/svg/down.svg",
    defeated: "icons/svg/skull.svg",
    light: "icons/svg/fire.svg",
    template: "icons/svg/explosion.svg",
    sound: "icons/svg/sound.svg",
    doorClosed: "icons/svg/door-steel.svg",
    doorOpen: "icons/svg/door-exit.svg",
    doorLocked: "icons/svg/padlock.svg"
  },

  /**
   * Suggested font families that are displayed wherever a choice is presented
   * @type {Array}
   */
  fontFamilies: [
    "Arial",
    "Arial Black",
    "Comic Sans MS",
    "Courier New",
    "Times New Roman",
    "Signika",
    "Modesto Condensed"
  ],

  /**
   * The default font family used for text labels on the PIXI Canvas
   * @type {String}
   */
  defaultFontFamily: "Signika",

  /**
   * An array of status effect icons which can be applied to Tokens
   * @type {Array}
   */
  statusEffects: [
    "icons/svg/skull.svg",
    "icons/svg/unconscious.svg",
    "icons/svg/sleep.svg",
    "icons/svg/daze.svg",

    "icons/svg/falling.svg",
    "icons/svg/blind.svg",
    "icons/svg/deaf.svg",
    "icons/svg/stoned.svg",

    "icons/svg/target.svg",
    "icons/svg/eye.svg",
    "icons/svg/net.svg",
    "icons/svg/blood.svg",

    "icons/svg/terror.svg",
    "icons/svg/radiation.svg",
    "icons/svg/biohazard.svg",
    "icons/svg/poison.svg",

    "icons/svg/regen.svg",
    "icons/svg/degen.svg",
    "icons/svg/sun.svg",
    "icons/svg/angel.svg",

    "icons/svg/fire.svg",
    "icons/svg/frozen.svg",
    "icons/svg/lightning.svg",
    "icons/svg/acid.svg",
    
    "icons/svg/fire-shield.svg",
    "icons/svg/ice-shield.svg",
    "icons/svg/mage-shield.svg",
    "icons/svg/holy-shield.svg"
  ],

  /**
   * A mapping of core audio effects used which can be replaced by systems or mods
   * @type {Object}
   */
  sounds: {
    dice: "sounds/dice.wav",
    lock: "sounds/lock.wav",
    notification: "sounds/notify.wav",
    combat: "sounds/drums.wav"
  },

  /**
   * Define the set of supported languages for localization
   * @type {Object}
   */
  supportedLanguages: {
    en: "English"
  },

  /**
   * Default configuration options for TinyMCE editors
   */
  TinyMCE: {
    css: ["/css/mce.css"],
    plugins: "lists image table hr code save link",
    toolbar: "styleselect bullist numlist image table hr link removeformat code save"
  },

  /**
   * Configure the Application classes used to render various core UI elements in the application
   */
  ui: {
    actors: ActorDirectory,
    chat: ChatLog,
    combat: CombatTracker,
    compendium: CompendiumDirectory,
    controls: SceneControls,
    hotbar: Hotbar,
    items: ItemDirectory,
    journal: JournalDirectory,
    macros: MacroDirectory,
    menu: MainMenu,
    nav: SceneNavigation,
    notifications: Notifications,
    pause: Pause,
    players: PlayerList,
    playlists: PlaylistDirectory,
    scenes: SceneDirectory,
    settings: Settings,
    sidebar: Sidebar,
    tables: RollTableDirectory,
    webrtc: CameraViews
  },

  /**
   * Available Weather Effects implementations
   * @type {Object}
   */
  weatherEffects: {
    leaves: AutumnLeavesWeatherEffect,
    rain: RainWeatherEffect,
    snow: SnowWeatherEffect
  },

  /**
   * Configuration for the WebRTC implementation class
   * @type {Object}
   */
  WebRTC: {
    clientClass: EasyRTCClient,
    emitVolumeInterval: 50,
    speakingThresholdEvents: 2,
    speakingHistoryLength: 10
  }
};
