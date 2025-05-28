const logger = require('../utils/logger');
const MessageFormatter = require('../utils/messageFormatter');
const PermissionManager = require('../utils/permissions');
const databaseClient = require('../database/client');
const sessionService = require('./sessionService');
const messageUpdateService = require('./messageUpdateService');

/**
 * Service for handling voice channel notifications
 */
class NotificationService {
  constructor() {
    this.rateLimitMap = new Map(); // Simple rate limiting
  }

  /**
   * Send notifications for users joining a voice channel
   * @param {VoiceState} newState - New voice state
   * @param {VoiceState} oldState - Old voice state
   */
  async handleVoiceStateUpdate(newState, oldState) {
    try {
      // User joined a channel
      if (!oldState.channel && newState.channel) {
        await this.handleUserJoinedChannel(newState);
      }
      
      // User left a channel
      if (oldState.channel && !newState.channel) {
        await this.handleUserLeftChannel(oldState);
      }
      
      // User moved between channels
      if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
        await this.handleUserLeftChannel(oldState);
        await this.handleUserJoinedChannel(newState);
      }
    } catch (error) {
      logger.error('Error handling voice state update:', error);
    }
  }
  /**
   * Handle user joining a voice channel
   * @param {VoiceState} voiceState - Voice state
   */
  async handleUserJoinedChannel(voiceState) {
    try {
      const { channel, guild, member } = voiceState;
      const prisma = databaseClient.getClient();

      // Get guild configuration and monitored channel
      const [guildConfig, monitoredChannel] = await Promise.all([
        prisma.guild.findUnique({ where: { id: guild.id } }),
        prisma.monitoredChannel.findFirst({
          where: {
            guildId: guild.id,
            channelId: channel.id
          }
        })
      ]);

      if (!guildConfig || !monitoredChannel) {
        return; // Not a monitored channel or guild not configured
      }

      // Get current users in the channel (excluding bots)
      const currentUsers = channel.members.filter(m => !m.user.bot);
      
      // Check if channel has fewer users than maxUsers limit
      if (currentUsers.size > guildConfig.maxUsers) {
        logger.debug(`Channel ${channel.name} has ${currentUsers.size} users, exceeding limit of ${guildConfig.maxUsers}`);
        return;
      }

      // Check if this is a new session or continuing session
      const activeSession = await sessionService.getActiveChannelSession(guild.id, channel.id);
      
      if (!activeSession && currentUsers.size >= 1) {
        // New session - first user(s) joined empty channel
        await this.startNewNotificationSession(guild.id, channel, currentUsers, guildConfig, monitoredChannel);
      } else if (activeSession && currentUsers.size > 1) {
        // Continuing session - update existing DMs
        await this.updateExistingNotifications(guild.id, channel.id, activeSession.sessionId, currentUsers, guildConfig, monitoredChannel);
      }

      logger.info(`Processed voice join for ${channel.name} in ${guild.name} - ${currentUsers.size} users present`);
    } catch (error) {
      logger.error('Error handling user joined channel:', error);
    }
  }
  /**
   * Handle user leaving a voice channel
   * @param {VoiceState} voiceState - Voice state
   */
  async handleUserLeftChannel(voiceState) {
    try {
      const { channel, guild } = voiceState;
      
      // Get remaining users in channel (excluding bots)
      const remainingUsers = channel.members.filter(m => !m.user.bot);
      
      if (remainingUsers.size === 0) {
        // Channel is now empty - end session
        await sessionService.endSession(guild.id, channel.id);
        logger.info(`Ended session for empty channel ${channel.name} in ${guild.name}`);
      } else {
        // Update existing notifications with new user list
        const activeSession = await sessionService.getActiveChannelSession(guild.id, channel.id);
        if (activeSession) {
          // Get guild config and monitored channel
          const prisma = databaseClient.getClient();
          const [guildConfig, monitoredChannel] = await Promise.all([
            prisma.guild.findUnique({ where: { id: guild.id } }),
            prisma.monitoredChannel.findFirst({
              where: {
                guildId: guild.id,
                channelId: channel.id
              }
            })
          ]);

          if (guildConfig && monitoredChannel) {
            await this.updateExistingNotifications(
              guild.id, 
              channel.id, 
              activeSession.sessionId, 
              remainingUsers, 
              guildConfig, 
              monitoredChannel
            );
          }
        }
      }
    } catch (error) {
      logger.error('Error handling user left channel:', error);
    }
  }  /**
   * Start a new notification session
   * @param {string} guildId - Guild ID
   * @param {VoiceChannel} channel - Voice channel
   * @param {Collection} currentUsers - Current users in channel
   * @param {Object} guildConfig - Guild configuration
   * @param {Object} monitoredChannel - Monitored channel data
   */
  async startNewNotificationSession(guildId, channel, currentUsers, guildConfig, monitoredChannel) {
    try {
      // Start new session
      const session = await sessionService.startNewSession(guildId, channel.id, currentUsers);
      
      // Get all subscribers for this channel
      const prisma = databaseClient.getClient();
      const subscribers = await prisma.userSubscription.findMany({
        where: {
          guildId,
          channelId: channel.id
        }
      });

      if (subscribers.length === 0) {
        logger.debug(`No subscribers for channel ${channel.name}`);
        return;
      }

      // Send initial DMs and track them
      const userListForStorage = sessionService.formatUserListForStorage(currentUsers);
      
      for (const subscriber of subscribers) {
        try {
          // Skip if subscriber is already in the channel
          if (currentUsers.has(subscriber.userId)) {
            logger.debug(`User ${subscriber.userId} is already in channel ${channel.name}, skipping notification`);
            continue;
          }

          // Check rate limiting
          const rateLimitKey = `${subscriber.userId}-${guildId}`;
          const lastSent = this.rateLimitMap.get(rateLimitKey);
          const now = Date.now();
          
          if (lastSent && (now - lastSent) < 5000) {
            logger.debug(`Rate limiting notification for user ${subscriber.userId}`);
            continue;
          }

          // Send initial DM
          const sentMessage = await messageUpdateService.sendNewDM(
            subscriber.userId,
            currentUsers,
            guildConfig,
            monitoredChannel
          );

          if (sentMessage) {
            // Track this notification for future updates
            await sessionService.createNotificationState({
              guildId,
              channelId: channel.id,
              userId: subscriber.userId,
              messageId: sentMessage.id,
              sessionId: session.sessionId,
              userList: userListForStorage
            });

            // Update rate limit
            this.rateLimitMap.set(rateLimitKey, now);
          }
        } catch (error) {
          logger.error(`Failed to send initial DM to user ${subscriber.userId}:`, error);
        }
      }

      logger.info(`Started new notification session for ${channel.name} with ${subscribers.length} potential subscribers`);
    } catch (error) {
      logger.error('Error starting new notification session:', error);
    }
  }

  /**
   * Update existing notifications for a session
   * @param {string} guildId - Guild ID
   * @param {string} channelId - Channel ID
   * @param {string} sessionId - Session ID
   * @param {Collection} currentUsers - Current users in channel
   * @param {Object} guildConfig - Guild configuration
   * @param {Object} monitoredChannel - Monitored channel data
   */
  async updateExistingNotifications(guildId, channelId, sessionId, currentUsers, guildConfig, monitoredChannel) {
    try {
      // Get all active notifications for this session
      const activeNotifications = await sessionService.getActiveNotifications(guildId, channelId, sessionId);
      
      if (activeNotifications.length === 0) {
        logger.debug(`No active notifications to update for session ${sessionId}`);
        return;
      }

      const userListForStorage = sessionService.formatUserListForStorage(currentUsers);
      let updatedCount = 0;
      let failedCount = 0;

      // Use queue to handle rapid updates
      const updateKey = `${guildId}-${channelId}-${sessionId}`;
      messageUpdateService.queueUpdate(updateKey, async () => {
        // Update each existing DM
        for (const notification of activeNotifications) {
          try {
            // Skip if subscriber is now in the channel
            if (currentUsers.has(notification.userId)) {
              logger.debug(`User ${notification.userId} is now in channel, skipping update`);
              continue;
            }

            // Try to update the existing DM
            const updateSuccess = await messageUpdateService.updateDMMessage(
              notification,
              currentUsers,
              guildConfig,
              monitoredChannel
            );

            if (updateSuccess) {
              // Update notification state
              await sessionService.updateNotificationState(notification.id, userListForStorage);
              updatedCount++;
            } else {
              // Handle failed update by sending new DM
              const newMessageId = await messageUpdateService.handleFailedMessageUpdate(
                notification,
                currentUsers,
                guildConfig,
                monitoredChannel,
                async (notificationId, messageId) => {
                  const prisma = databaseClient.getClient();
                  await prisma.notificationState.update({
                    where: { id: notificationId },
                    data: { 
                      messageId,
                      userList: userListForStorage,
                      lastUpdated: new Date()
                    }
                  });
                }
              );

              if (newMessageId) {
                updatedCount++;
              } else {
                // Mark as inactive if we can't reach the user
                await sessionService.deactivateNotification(notification.id);
                failedCount++;
              }
            }
          } catch (error) {
            logger.error(`Failed to update notification for user ${notification.userId}:`, error);
            failedCount++;
          }
        }

        logger.info(`Updated notifications for ${monitoredChannel.channelName}: ${updatedCount} updated, ${failedCount} failed`);
      }, 500); // 500ms delay to batch rapid changes
    } catch (error) {
      logger.error('Error updating existing notifications:', error);
    }
  }

  /**
   * Clean up old rate limit entries
   */
  cleanupRateLimits() {
    const now = Date.now();
    const cutoff = now - 300000; // 5 minutes
    
    for (const [key, timestamp] of this.rateLimitMap.entries()) {
      if (timestamp < cutoff) {
        this.rateLimitMap.delete(key);
      }
    }
  }

  /**
   * Initialize session cleanup on bot startup
   * @param {Client} discordClient - Discord client
   */
  async initializeOnStartup(discordClient) {
    try {
      await sessionService.cleanupOrphanedSessions(discordClient);
      logger.info('Session cleanup completed on startup');
    } catch (error) {
      logger.error('Error during startup session cleanup:', error);
    }
  }

  /**
   * Graceful shutdown - flush pending updates
   */
  async shutdown() {
    try {
      await messageUpdateService.flushQueue();
      sessionService.clearCache();
      logger.info('Notification service shutdown completed');
    } catch (error) {
      logger.error('Error during notification service shutdown:', error);
    }
  }
}

// Start cleanup interval
const notificationService = new NotificationService();

// Clean up rate limits every 5 minutes
setInterval(() => {
  notificationService.cleanupRateLimits();
}, 300000);

module.exports = notificationService;
