const { Events } = require('discord.js');
const logger = require('../utils/logger');
const subscriptionService = require('../services/subscriptionService');

module.exports = {
  name: Events.MessageReactionAdd,
  async execute(reaction, user) {
    try {
      // Fetch partial reactions
      if (reaction.partial) {
        try {
          await reaction.fetch();
        } catch (error) {
          logger.error('Something went wrong when fetching the reaction:', error);
          return;
        }
      }

      // Handle subscription reactions
      await subscriptionService.handleReactionAdd(reaction, user);
    } catch (error) {
      logger.error('Error in messageReactionAdd event:', error);
    }
  }
};
