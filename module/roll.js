export const toMessage = function(messageData={}, {rollMode=null, create=true}={}) {

    // Perform the roll, if it has not yet been rolled
    if (!this._rolled) this.evaluate();

    // Prepare chat data
    messageData = mergeObject({
      user: game.user._id,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      content: this.total,
      sound: CONFIG.sounds.dice,
    }, messageData);
    messageData.roll = this;

    // Prepare message options
    const messageOptions = {rollMode};

    // Either create the message or just return the chat data
    return create ? CONFIG.ChatMessage.entityClass.create(messageData, messageOptions) : messageData;
  }