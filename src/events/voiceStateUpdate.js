const { Events } = require('discord.js');
const logger = require('../utils/logger');
const notificationService = require('../services/notificationService');

module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState) {
    try {
      // Handle voice state changes
      await notificationService.handleVoiceStateUpdate(newState, oldState);
    } catch (error) {
      logger.error('Error in voiceStateUpdate event:', error);
    }
  }
};
