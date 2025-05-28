const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

/**
 * Prisma client instance with error handling and logging
 */
class DatabaseClient {
  constructor() {
    this.prisma = new PrismaClient({
      log: [
        { level: 'error', emit: 'event' },
        { level: 'warn', emit: 'event' },
        { level: 'info', emit: 'event' },
        { level: 'query', emit: 'event' }
      ]
    });

    this.setupEventListeners();
  }

  /**
   * Setup Prisma event listeners for logging
   */
  setupEventListeners() {
    this.prisma.$on('error', (e) => {
      logger.error('Database error:', e);
    });

    this.prisma.$on('warn', (e) => {
      logger.warn('Database warning:', e);
    });

    this.prisma.$on('info', (e) => {
      logger.info('Database info:', e);
    });

    this.prisma.$on('query', (e) => {
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Database query:', {
          query: e.query,
          duration: e.duration + 'ms',
          params: e.params
        });
      }
    });
  }

  /**
   * Connect to the database
   */
  async connect() {
    try {
      await this.prisma.$connect();
      logger.info('Database connection established');
    } catch (error) {
      logger.error('Failed to connect to database:', error);
      throw error;
    }
  }

  /**
   * Disconnect from the database
   */
  async disconnect() {
    try {
      await this.prisma.$disconnect();
      logger.info('Database connection closed');
    } catch (error) {
      logger.error('Error disconnecting from database:', error);
      throw error;
    }
  }

  /**
   * Get the Prisma client instance
   * @returns {PrismaClient} The Prisma client
   */
  getClient() {
    return this.prisma;
  }

  /**
   * Health check for database connection
   * @returns {Promise<boolean>} True if database is healthy
   */
  async healthCheck() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
const databaseClient = new DatabaseClient();
module.exports = databaseClient;
