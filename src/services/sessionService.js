const logger = require('../utils/logger');
const databaseClient = require('../database/client');
const crypto = require('crypto');

/**
 * Service for managing voice channel sessions and message updates
 */
class SessionService {
  constructor() {
    this.activeSessions = new Map(); // In-memory cache for performance
  }

  /**
   * Generate a unique session ID
   * @returns {string} Session ID
   */
  generateSessionId() {
    return `session_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * Get active session for a channel
   * @param {string} guildId - Guild ID
   * @param {string} channelId - Channel ID
   * @returns {Object|null} Active session or null
   */
  async getActiveChannelSession(guildId, channelId) {
    try {
      const cacheKey = `${guildId}-${channelId}`;
      
      // Check cache first
      if (this.activeSessions.has(cacheKey)) {
        return this.activeSessions.get(cacheKey);
      }

      const prisma = databaseClient.getClient();
      const session = await prisma.channelSession.findFirst({
        where: {
          guildId,
          channelId,
          isActive: true
        }
      });

      if (session) {
        this.activeSessions.set(cacheKey, session);
      }

      return session;
    } catch (error) {
      logger.error('Error getting active channel session:', error);
      return null;
    }
  }

  /**
   * Start a new voice channel session
   * @param {string} guildId - Guild ID
   * @param {string} channelId - Channel ID
   * @param {Collection} currentUsers - Current users in channel
   * @returns {Object} New session object
   */
  async startNewSession(guildId, channelId, currentUsers) {
    try {
      const sessionId = this.generateSessionId();
      const prisma = databaseClient.getClient();

      // Create new session record
      const session = await prisma.channelSession.create({
        data: {
          guildId,
          channelId,
          sessionId,
          isActive: true,
          startedAt: new Date()
        }
      });

      // Cache the session
      const cacheKey = `${guildId}-${channelId}`;
      this.activeSessions.set(cacheKey, session);

      logger.info(`Started new session ${sessionId} for channel ${channelId} in guild ${guildId}`);
      return session;
    } catch (error) {
      logger.error('Error starting new session:', error);
      throw error;
    }
  }

  /**
   * End a voice channel session
   * @param {string} guildId - Guild ID
   * @param {string} channelId - Channel ID
   */
  async endSession(guildId, channelId) {
    try {
      const prisma = databaseClient.getClient();

      // Mark current session as ended
      await prisma.channelSession.updateMany({
        where: {
          guildId,
          channelId,
          isActive: true
        },
        data: {
          isActive: false,
          endedAt: new Date()
        }
      });

      // Mark all notifications as inactive
      await prisma.notificationState.updateMany({
        where: {
          guildId,
          channelId,
          isActive: true
        },
        data: {
          isActive: false
        }
      });

      // Remove from cache
      const cacheKey = `${guildId}-${channelId}`;
      this.activeSessions.delete(cacheKey);

      logger.info(`Ended session for channel ${channelId} in guild ${guildId}`);
    } catch (error) {
      logger.error('Error ending session:', error);
      throw error;
    }
  }

  /**
   * Get all active notification states for a session
   * @param {string} guildId - Guild ID
   * @param {string} channelId - Channel ID
   * @param {string} sessionId - Session ID
   * @returns {Array} Active notification states
   */
  async getActiveNotifications(guildId, channelId, sessionId) {
    try {
      const prisma = databaseClient.getClient();
      
      return await prisma.notificationState.findMany({
        where: {
          guildId,
          channelId,
          sessionId,
          isActive: true
        }
      });
    } catch (error) {
      logger.error('Error getting active notifications:', error);
      return [];
    }
  }

  /**
   * Create a notification state record
   * @param {Object} data - Notification data
   * @returns {Object} Created notification state
   */
  async createNotificationState(data) {
    try {
      const prisma = databaseClient.getClient();
      
      return await prisma.notificationState.create({
        data: {
          guildId: data.guildId,
          channelId: data.channelId,
          userId: data.userId,
          messageId: data.messageId,
          sessionId: data.sessionId,
          isActive: true,
          userList: data.userList,
          lastUpdated: new Date(),
          createdAt: new Date()
        }
      });
    } catch (error) {
      logger.error('Error creating notification state:', error);
      throw error;
    }
  }

  /**
   * Update a notification state record
   * @param {string} notificationId - Notification ID
   * @param {Object} userList - Updated user list
   * @returns {Object} Updated notification state
   */
  async updateNotificationState(notificationId, userList) {
    try {
      const prisma = databaseClient.getClient();
      
      return await prisma.notificationState.update({
        where: { id: notificationId },
        data: {
          userList,
          lastUpdated: new Date()
        }
      });
    } catch (error) {
      logger.error('Error updating notification state:', error);
      throw error;
    }
  }

  /**
   * Mark a notification as inactive
   * @param {string} notificationId - Notification ID
   */
  async deactivateNotification(notificationId) {
    try {
      const prisma = databaseClient.getClient();
      
      await prisma.notificationState.update({
        where: { id: notificationId },
        data: { isActive: false }
      });
    } catch (error) {
      logger.error('Error deactivating notification:', error);
      throw error;
    }
  }

  /**
   * Clean up orphaned sessions on bot startup
   * @param {Client} discordClient - Discord client
   */
  async cleanupOrphanedSessions(discordClient) {
    try {
      const prisma = databaseClient.getClient();
      
      // Get all active sessions
      const activeSessions = await prisma.channelSession.findMany({
        where: { isActive: true }
      });

      logger.info(`Checking ${activeSessions.length} active sessions for cleanup`);

      for (const session of activeSessions) {
        try {
          const guild = await discordClient.guilds.fetch(session.guildId);
          const channel = await guild.channels.fetch(session.channelId);
          
          if (!channel || channel.members.filter(m => !m.user.bot).size === 0) {
            // Channel doesn't exist or is empty, end the session
            await this.endSession(session.guildId, session.channelId);
            logger.info(`Cleaned up orphaned session ${session.sessionId}`);
          }
        } catch (error) {
          // Guild or channel doesn't exist, clean up
          await this.endSession(session.guildId, session.channelId);
          logger.info(`Cleaned up invalid session ${session.sessionId}: ${error.message}`);
        }
      }
    } catch (error) {
      logger.error('Error during session cleanup:', error);
    }
  }

  /**
   * Format user list for storage
   * @param {Collection} users - Discord users collection
   * @returns {Array} Formatted user list
   */
  formatUserListForStorage(users) {
    return Array.from(users.values()).map(user => ({
      id: user.id,
      username: user.user.username,
      displayName: user.displayName || user.user.displayName,
      avatar: user.user.avatar
    }));
  }

  /**
   * Clear session cache
   */
  clearCache() {
    this.activeSessions.clear();
    logger.debug('Session cache cleared');
  }
}

module.exports = new SessionService();
