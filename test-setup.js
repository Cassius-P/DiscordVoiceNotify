/**
 * Simple validation test for the Discord Voice Notification Bot
 * Run this to check if the basic setup is working
 */

require('dotenv').config();
const logger = require('./src/utils/logger');
const DevUtils = require('./src/utils/devUtils');

async function runTests() {
  logger.info('Starting validation tests...');
  
  try {
    // Test 1: Environment variables
    logger.info('Test 1: Checking environment variables...');
    DevUtils.checkEnvironmentVariables();
    logger.info('✅ Environment variables OK');
    
    // Test 2: Database connection
    logger.info('Test 2: Testing database connection...');
    const databaseClient = require('./src/database/client');
    await databaseClient.connect();
    const isHealthy = await databaseClient.healthCheck();
    
    if (isHealthy) {
      logger.info('✅ Database connection OK');
    } else {
      throw new Error('Database health check failed');
    }
    
    await databaseClient.disconnect();
    
    // Test 3: Load commands
    logger.info('Test 3: Loading commands...');
    const fs = require('fs');
    const path = require('path');
    
    const commandsPath = path.join(__dirname, 'src', 'commands');
    const commandFiles = fs.readdirSync(commandsPath)
      .filter(file => file.endsWith('.js') && file !== 'index.js');
    
    let commandCount = 0;
    for (const file of commandFiles) {
      const command = require(path.join(commandsPath, file));
      if ('data' in command && 'execute' in command) {
        commandCount++;
        logger.debug(`Loaded command: ${command.data.name}`);
      }
    }
    
    logger.info(`✅ Loaded ${commandCount} commands`);
    
    // Test 4: Load events
    logger.info('Test 4: Loading events...');
    const eventsPath = path.join(__dirname, 'src', 'events');
    const eventFiles = fs.readdirSync(eventsPath)
      .filter(file => file.endsWith('.js') && file !== 'index.js');
    
    let eventCount = 0;
    for (const file of eventFiles) {
      const event = require(path.join(eventsPath, file));
      if ('name' in event && 'execute' in event) {
        eventCount++;
        logger.debug(`Loaded event: ${event.name}`);
      }
    }
    
    logger.info(`✅ Loaded ${eventCount} events`);
    
    logger.info('🎉 All validation tests passed!');
    logger.info('Your bot is ready to run. Use "npm start" to start the bot.');
    
  } catch (error) {
    logger.error('❌ Validation test failed:', error);
    logger.error('Please fix the issues above before starting the bot.');
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(error => {
    logger.error('Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = { runTests };
