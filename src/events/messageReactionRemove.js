const { Events } = require('discord.js');
const logger = require('../utils/logger');
const subscriptionService = require('../services/subscriptionService');

module.exports = {
  name: Events.MessageReactionRemove,
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

      // Handle subscription reaction removal
      await subscriptionService.handleReactionRemove(reaction, user);
    } catch (error) {
      logger.error('Error in messageReactionRemove event:', error);
    }
  }
};
