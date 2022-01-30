/**
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class ffrpg4eActor extends Actor {

  /** @override */
  prepareData() {
    // Prepare data for the actor. Calling the super version of this executes
    // the following, in order: data reset (to clear active effects),
    // prepareBaseData(), prepareEmbeddedDocuments() (including active effects),
    // prepareDerivedData().
    super.prepareData();
  }

  /** @override */
  prepareBaseData() {
    // Data modifications in this step occur before processing embedded
    // documents or derived data.
  }

  /**
   * @override
   * Augment the basic actor data with additional dynamic data. Typically,
   * you'll want to handle most of your calculated/derived data in this step.
   * Data calculated in this step should generally not exist in template.json
   * (such as ability modifiers rather than ability scores) and should be
   * available both inside and outside of character sheets (such as if an actor
   * is queried and has a roll executed directly from it).
   */
  prepareDerivedData() {
    const actorData = this.data;
    const data = actorData.data;
    const flags = actorData.flags.ffrpg4e || {};

    // Make separate methods for each Actor type (character, npc, etc.) to keep
    // things organized.
    this._prepareCharacterData(actorData);
  }

  /**
   * Prepare Character type specific data
   */
  _prepareCharacterData(actorData) {
    if (actorData.type !== 'character') return;

    // Make modifications to data here. For example:
    const data = actorData.data;
     // Make modifications to data here. For example:
    let expCount = 0;
    let levelCount = 0;
    // Loop through ability scores, and add their modifiers to our sheet output.
    for (let [key, ability] of Object.entries(data.abilities)) {
      // Calculate the modifier using d100 rules.
      if(data.expVal){
            ability.level = Math.floor(Math.sqrt(ability.exp/10))
            ability.value = Math.floor(ability.level*10 + (ability.exp-(ability.level**2)*10)/(ability.level*2+1));
            levelCount += ability.level;
            expCount+=ability.exp;
          }
      else{
            ability.level = Math.floor(ability.value/10);
            ability.exp = 10*(ability.level**2)+(ability.value%10 * (2*ability.level+1));
            levelCount += ability.level;
            expCount+=ability.exp;
          }
      ability.nextLevel = (1+2*ability.level)*(10-ability.value%10)
      ability.nextValue = (1+2*ability.level)-(ability.exp-(ability.level**2)*10)%(1+2*ability.level);
      data.attributes.level.value=levelCount;
      data.attributes.exp.spent = expCount;

    }
    
    data.health.max = data.attributes.level.value * data.attributes.job.hpMult + data.abilities.earth.value;
    data.mana.max = data.attributes.level.value * data.attributes.job.mpMult + data.abilities.water.value
    let skillBudget = Math.floor(levelCount/3);
    data.attributes.skillPoints.budget=skillBudget;
    data.attributes.skillPoints.earthBudget=data.abilities.earth.level;
    data.attributes.skillPoints.airBudget=data.abilities.air.level;
    data.attributes.skillPoints.fireBudget=data.abilities.fire.level;
    data.attributes.skillPoints.waterBudget=data.abilities.water.level;
    let skillCount = 0;
    let skillArr=[]
    let localCount=0;
    for (let [key, ability] of Object.entries(data.skills)){
      for (let [skill, value] of Object.entries(ability)){
        localCount+=(value-1)
      }
        skillCount+=localCount
        skillArr.push(localCount)
        localCount=0;
    }
    data.attributes.skillPoints.earthSpent=skillArr[0];
    data.attributes.skillPoints.airSpent=skillArr[1];
    data.attributes.skillPoints.fireSpent=skillArr[2];
    data.attributes.skillPoints.waterSpent=skillArr[3];
    data.attributes.skillPoints.totalSpent=skillCount;
  }

  /**
   * Override getRollData() that's supplied to rolls.
   */
  getRollData() {
    const data = super.getRollData();

    // Prepare character roll data.
    this._getCharacterRollData(data);

    return data;
  }

  /**
   * Prepare character roll data.
   */
  _getCharacterRollData(data) {
    if (this.data.type !== 'character') return;

    // Add level for easier access, or fall back to 0.
    if (data.attributes.level) {
      data.lvl = data.attributes.level.value ?? 0;
    }
  }

}