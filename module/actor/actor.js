/**
 * Extend the base Actor entity by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class FFRPGActor extends Actor {

  /**
   * Augment the basic actor data with additional dynamic data.
   */
  prepareData() {
    super.prepareData();

    const actorData = this.data;
    const data = actorData.data;
    const flags = actorData.flags;

    // Make separate methods for each Actor type (character, npc, etc.) to keep
    // things organized.
    if (actorData.type === 'character') this._prepareCharacterData(actorData);
  }

  /**
   * Prepare Character type specific data
   */
  _prepareCharacterData(actorData) {
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

}