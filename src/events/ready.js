const { Events } = require('discord.js');
const logger = require('../utils/logger');
const { bot } = require('../bot');
const notificationService = require('../services/notificationService');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    try {
      logger.info(`Bot logged in as ${client.user.tag}!`);
      logger.info(`Serving ${client.guilds.cache.size} guilds`);
        // Set bot ready status
      bot.setReady(true);
        // Set bot activity
      client.user.setActivity('Voice channels for notifications', { type: 'Watching' });
      
      // Initialize session cleanup
      await notificationService.initializeOnStartup(client);
      
      // Register slash commands globally
      await registerCommands(client);
      
      logger.info('Bot is ready and operational!');
    } catch (error) {
      logger.error('Error in ready event:', error);
    }
  }
};

/**
 * Register slash commands with Discord
 * @param {Client} client - Discord client
 */
async function registerCommands(client) {
  try {
    const { commands } = require('../bot');
    const commandData = Array.from(commands.values()).map(command => command.data.toJSON());
    
    // Register commands globally
    await client.application.commands.set(commandData);
    
    logger.info(`Registered ${commandData.length} slash commands globally`);
  } catch (error) {
    logger.error('Failed to register slash commands:', error);
  }
}
