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
      // Calculate the modifier using d20 rules.
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
      // ability.nextValue = 1+2*ability.level;

    }
    // console.log(data.expVal)
    // console.log(expCount)
  }

}