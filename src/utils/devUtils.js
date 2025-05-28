const logger = require('../utils/logger');
const databaseClient = require('../database/client');

/**
 * Development utilities and startup checks
 */
class DevUtils {
  /**
   * Perform startup health checks
   */
  static async startupHealthCheck() {
    try {
      logger.info('Performing startup health checks...');
      
      // Check database connection
      const isDbHealthy = await databaseClient.healthCheck();
      if (!isDbHealthy) {
        throw new Error('Database health check failed');
      }
      
      // Check environment variables
      this.checkEnvironmentVariables();
      
      logger.info('Startup health checks completed successfully');
      return true;
    } catch (error) {
      logger.error('Startup health check failed:', error);
      return false;
    }
  }

  /**
   * Check required environment variables
   */
  static checkEnvironmentVariables() {
    const required = ['DISCORD_TOKEN', 'DATABASE_URL'];
    const missing = required.filter(env => !process.env[env]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    // Validate Discord token format
    if (!process.env.DISCORD_TOKEN.match(/^[A-Za-z0-9._-]+$/)) {
      logger.warn('Discord token format appears invalid');
    }
    
    logger.debug('Environment variables validated');
  }

  /**
   * Log startup information
   */
  static logStartupInfo() {
    logger.info('='.repeat(50));
    logger.info('Discord Voice Notification Bot');
    logger.info('='.repeat(50));
    logger.info(`Node.js version: ${process.version}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Process ID: ${process.pid}`);
    logger.info(`Working directory: ${process.cwd()}`);
    logger.info('='.repeat(50));
  }

  /**
   * Create logs directory if it doesn't exist
   */
  static ensureLogsDirectory() {
    const fs = require('fs');
    const path = require('path');
    
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
      logger.debug('Created logs directory');
    }
  }
}

module.exports = DevUtils;
