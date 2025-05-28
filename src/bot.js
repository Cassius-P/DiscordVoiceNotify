require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');

const logger = require('./utils/logger');
const databaseClient = require('./database/client');
const DevUtils = require('./utils/devUtils');

/**
 * Discord Bot Client Setup
 */
class DiscordBot {
  constructor() {
    // Create Discord client with required intents
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.DirectMessages
      ],
      partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction
      ]
    });

    this.commands = new Collection();
    this.isReady = false;
  }
  /**
   * Initialize the bot
   */
  async initialize() {
    try {
      // Log startup information
      DevUtils.logStartupInfo();
      
      // Ensure logs directory exists
      DevUtils.ensureLogsDirectory();
      
      // Perform health checks
      const healthCheckPassed = await DevUtils.startupHealthCheck();
      if (!healthCheckPassed) {
        throw new Error('Startup health checks failed');
      }
      
      // Connect to database
      await databaseClient.connect();
      
      // Load commands and events
      await this.loadCommands();
      await this.loadEvents();
      
      // Setup graceful shutdown
      this.setupGracefulShutdown();
      
      // Login to Discord
      await this.client.login(process.env.DISCORD_TOKEN);
      
      logger.info('Bot initialization completed');
    } catch (error) {
      logger.error('Failed to initialize bot:', error);
      process.exit(1);
    }
  }

  /**
   * Load slash commands
   */
  async loadCommands() {
    const commandsPath = path.join(__dirname, 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
      if (file === 'index.js') continue; // Skip index file
      
      const filePath = path.join(commandsPath, file);
      try {
        const command = require(filePath);
        
        if ('data' in command && 'execute' in command) {
          this.commands.set(command.data.name, command);
          logger.debug(`Loaded command: ${command.data.name}`);
        } else {
          logger.warn(`Command at ${filePath} is missing required "data" or "execute" property`);
        }
      } catch (error) {
        logger.error(`Error loading command ${file}:`, error);
      }
    }

    logger.info(`Loaded ${this.commands.size} commands`);
  }

  /**
   * Load event handlers
   */
  async loadEvents() {
    const eventsPath = path.join(__dirname, 'events');
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {
      if (file === 'index.js') continue; // Skip index file
      
      const filePath = path.join(eventsPath, file);
      try {
        const event = require(filePath);
        
        if (event.once) {
          this.client.once(event.name, (...args) => event.execute(...args));
        } else {
          this.client.on(event.name, (...args) => event.execute(...args));
        }
        
        logger.debug(`Loaded event: ${event.name}`);
      } catch (error) {
        logger.error(`Error loading event ${file}:`, error);
      }
    }

    logger.info('Event handlers loaded');
  }
  /**
   * Setup graceful shutdown handlers
   */
  setupGracefulShutdown() {
    const gracefulShutdown = async (signal) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      
      try {
        // Shutdown notification service (flush pending updates)
        const notificationService = require('./services/notificationService');
        await notificationService.shutdown();
        
        // Destroy Discord client
        if (this.client) {
          this.client.destroy();
          logger.info('Discord client destroyed');
        }
        
        // Disconnect from database
        await databaseClient.disconnect();
        
        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during graceful shutdown:', error);
        process.exit(1);
      }
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('unhandledRejection');
    });
  }

  /**
   * Get the Discord client instance
   */
  getClient() {
    return this.client;
  }

  /**
   * Check if bot is ready
   */
  isClientReady() {
    return this.isReady;
  }

  /**
   * Set ready status
   */
  setReady(status) {
    this.isReady = status;
  }
}

// Create bot instance
const bot = new DiscordBot();

// Make client globally accessible
global.discordClient = bot.getClient();

// Export for use in other modules
module.exports = {
  bot,
  client: bot.getClient(),
  commands: bot.commands
};

// Start the bot if this file is run directly
if (require.main === module) {
  bot.initialize().catch(error => {
    logger.error('Failed to start bot:', error);
    process.exit(1);
  });
}
