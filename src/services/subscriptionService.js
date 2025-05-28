const logger = require('../utils/logger');
const databaseClient = require('../database/client');
const MessageFormatter = require('../utils/messageFormatter');

/**
 * Service for managing user subscriptions to voice channels
 */
class SubscriptionService {
  /**
   * Handle reaction add event for subscription management
   * @param {MessageReaction} reaction - Discord message reaction
   * @param {User} user - User who added the reaction
   */
  async handleReactionAdd(reaction, user) {
    try {
      // Ignore bot reactions
      if (user.bot) return;

      const { message, emoji } = reaction;
      const guildId = message.guild?.id;
      
      if (!guildId) return;

      // Find monitored channel by emoji
      const prisma = databaseClient.getClient();
      const monitoredChannel = await prisma.monitoredChannel.findFirst({
        where: {
          guildId: guildId,
          emoji: emoji.toString()
        }
      });

      if (!monitoredChannel) {
        logger.debug(`No monitored channel found for emoji ${emoji.toString()} in guild ${guildId}`);
        return;
      }

      // Add subscription
      await this.addSubscription(guildId, user.id, monitoredChannel.channelId);
      
      logger.info(`User ${user.tag} (${user.id}) subscribed to channel ${monitoredChannel.channelName} in guild ${guildId}`);
    } catch (error) {
      logger.error('Error handling reaction add:', error);
    }
  }

  /**
   * Handle reaction remove event for subscription management
   * @param {MessageReaction} reaction - Discord message reaction
   * @param {User} user - User who removed the reaction
   */
  async handleReactionRemove(reaction, user) {
    try {
      // Ignore bot reactions
      if (user.bot) return;

      const { message, emoji } = reaction;
      const guildId = message.guild?.id;
      
      if (!guildId) return;

      // Find monitored channel by emoji
      const prisma = databaseClient.getClient();
      const monitoredChannel = await prisma.monitoredChannel.findFirst({
        where: {
          guildId: guildId,
          emoji: emoji.toString()
        }
      });

      if (!monitoredChannel) {
        return;
      }

      // Remove subscription
      await this.removeSubscription(guildId, user.id, monitoredChannel.channelId);
      
      logger.info(`User ${user.tag} (${user.id}) unsubscribed from channel ${monitoredChannel.channelName} in guild ${guildId}`);
    } catch (error) {
      logger.error('Error handling reaction remove:', error);
    }
  }

  /**
   * Add a user subscription to a channel
   * @param {string} guildId - Guild ID
   * @param {string} userId - User ID
   * @param {string} channelId - Channel ID
   */
  async addSubscription(guildId, userId, channelId) {
    try {
      const prisma = databaseClient.getClient();
      
      await prisma.userSubscription.upsert({
        where: {
          guildId_userId_channelId: {
            guildId,
            userId,
            channelId
          }
        },
        update: {}, // No updates needed if already exists
        create: {
          guildId,
          userId,
          channelId
        }
      });

      logger.debug(`Added subscription: Guild ${guildId}, User ${userId}, Channel ${channelId}`);
    } catch (error) {
      logger.error('Error adding subscription:', error);
      throw error;
    }
  }

  /**
   * Remove a user subscription from a channel
   * @param {string} guildId - Guild ID
   * @param {string} userId - User ID
   * @param {string} channelId - Channel ID
   */
  async removeSubscription(guildId, userId, channelId) {
    try {
      const prisma = databaseClient.getClient();
      
      await prisma.userSubscription.deleteMany({
        where: {
          guildId,
          userId,
          channelId
        }
      });

      logger.debug(`Removed subscription: Guild ${guildId}, User ${userId}, Channel ${channelId}`);
    } catch (error) {
      logger.error('Error removing subscription:', error);
      throw error;
    }
  }

  /**
   * Get all subscriptions for a user in a guild
   * @param {string} guildId - Guild ID
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of subscriptions
   */
  async getUserSubscriptions(guildId, userId) {
    try {
      const prisma = databaseClient.getClient();
      
      return await prisma.userSubscription.findMany({
        where: {
          guildId,
          userId
        },
        include: {
          monitoredChannel: true
        }
      });
    } catch (error) {
      logger.error('Error getting user subscriptions:', error);
      return [];
    }
  }

  /**
   * Get all subscribers for a channel
   * @param {string} guildId - Guild ID
   * @param {string} channelId - Channel ID
   * @returns {Promise<Array>} Array of user IDs
   */
  async getChannelSubscribers(guildId, channelId) {
    try {
      const prisma = databaseClient.getClient();
      
      const subscriptions = await prisma.userSubscription.findMany({
        where: {
          guildId,
          channelId
        }
      });

      return subscriptions.map(sub => sub.userId);
    } catch (error) {
      logger.error('Error getting channel subscribers:', error);
      return [];
    }
  }

  /**
   * Create subscription message with reactions
   * @param {TextChannel} textChannel - Text channel to send message to
   * @param {Array} monitoredChannels - Available monitored channels
   * @returns {Promise<Message>} Sent message
   */
  async createSubscriptionMessage(textChannel, monitoredChannels) {
    try {
      const embed = MessageFormatter.createSubscriptionEmbed(monitoredChannels, textChannel);
      
      const message = await textChannel.send({ embeds: [embed] });
      
      // Add reactions for each monitored channel
      for (const channel of monitoredChannels) {
        try {
          const emoji = MessageFormatter.parseEmoji(channel.emoji);
          await message.react(emoji.toString());
        } catch (error) {
          logger.error(`Failed to add reaction ${channel.emoji} to subscription message:`, error);
        }
      }

      logger.info(`Created subscription message in channel ${textChannel.name} (${textChannel.id})`);
      return message;
    } catch (error) {
      logger.error('Error creating subscription message:', error);
      throw error;
    }
  }

  /**
   * Clean up subscriptions for deleted channels
   * @param {string} guildId - Guild ID
   * @param {string} channelId - Deleted channel ID
   */
  async cleanupSubscriptionsForDeletedChannel(guildId, channelId) {
    try {
      const prisma = databaseClient.getClient();
      
      const deleted = await prisma.userSubscription.deleteMany({
        where: {
          guildId,
          channelId
        }
      });

      logger.info(`Cleaned up ${deleted.count} subscriptions for deleted channel ${channelId} in guild ${guildId}`);
    } catch (error) {
      logger.error('Error cleaning up subscriptions for deleted channel:', error);
    }
  }

  /**
   * Get subscription statistics for a guild
   * @param {string} guildId - Guild ID
   * @returns {Promise<Object>} Subscription statistics
   */
  async getSubscriptionStats(guildId) {
    try {
      const prisma = databaseClient.getClient();
      
      const [totalSubscriptions, uniqueUsers, channelStats] = await Promise.all([
        prisma.userSubscription.count({
          where: { guildId }
        }),
        prisma.userSubscription.groupBy({
          by: ['userId'],
          where: { guildId },
          _count: true
        }),
        prisma.userSubscription.groupBy({
          by: ['channelId'],
          where: { guildId },
          _count: true
        })
      ]);

      return {
        totalSubscriptions,
        uniqueUsers: uniqueUsers.length,
        channelStats: channelStats.map(stat => ({
          channelId: stat.channelId,
          subscriberCount: stat._count
        }))
      };
    } catch (error) {
      logger.error('Error getting subscription stats:', error);
      return {
        totalSubscriptions: 0,
        uniqueUsers: 0,
        channelStats: []
      };
    }
  }
}

module.exports = new SubscriptionService();
