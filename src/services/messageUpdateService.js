const logger = require('../utils/logger');
const MessageFormatter = require('../utils/messageFormatter');
const PermissionManager = require('../utils/permissions');

/**
 * Service for handling DM message updates and modifications
 */
class MessageUpdateService {
  constructor() {
    this.updateQueue = new Map(); // Queue to handle rapid updates
    this.processingQueue = false;
  }

  /**
   * Update an existing DM message
   * @param {Object} notification - Notification state object
   * @param {Collection} currentUsers - Current users in channel
   * @param {Object} guildConfig - Guild configuration
   * @param {Object} monitoredChannel - Monitored channel data
   * @returns {boolean} Success status
   */
  async updateDMMessage(notification, currentUsers, guildConfig, monitoredChannel) {
    try {
      const client = global.discordClient;
      if (!client) {
        throw new Error('Discord client not available');
      }

      // Get the user
      const user = await client.users.fetch(notification.userId);
      if (!user) {
        throw new Error(`Could not fetch user ${notification.userId}`);
      }

      // Check if we can still send DMs to this user
      const canSendDM = await PermissionManager.canSendDM(user);
      if (!canSendDM) {
        logger.debug(`Cannot send DM to user ${user.tag}, marking notification as inactive`);
        return false;
      }

      // Create DM channel
      const dmChannel = await user.createDM();

      // Format new user list
      const usernames = Array.from(currentUsers.values())
        .filter(member => !member.user.bot)
        .map(member => member.displayName || member.user.displayName);
      
      const formattedUserList = MessageFormatter.formatUserList(usernames, guildConfig.maxDisplayUsers);

      // Format notification message
      const updatedContent = MessageFormatter.formatNotificationMessage(
        guildConfig.customMessage,
        {
          channelName: monitoredChannel.channelName,
          userList: formattedUserList,
          emoji: monitoredChannel.emoji
        }
      );

      // Try to fetch and edit the existing message
      try {
        const message = await dmChannel.messages.fetch(notification.messageId);
        await message.edit(updatedContent);
        
        logger.debug(`Updated DM for user ${user.tag} (${user.id}) in channel ${monitoredChannel.channelName}`);
        return true;
      } catch (fetchError) {
        // Message might have been deleted or doesn't exist
        logger.warn(`Could not fetch/edit message ${notification.messageId} for user ${user.tag}: ${fetchError.message}`);
        return false;
      }
    } catch (error) {
      logger.error(`Failed to update DM for user ${notification.userId}:`, error);
      return false;
    }
  }

  /**
   * Send a new DM message
   * @param {string} userId - User ID to send DM to
   * @param {Collection} currentUsers - Current users in channel
   * @param {Object} guildConfig - Guild configuration
   * @param {Object} monitoredChannel - Monitored channel data
   * @returns {Object|null} Sent message object or null
   */
  async sendNewDM(userId, currentUsers, guildConfig, monitoredChannel) {
    try {
      const client = global.discordClient;
      if (!client) {
        throw new Error('Discord client not available');
      }

      // Get the user
      const user = await client.users.fetch(userId);
      if (!user) {
        throw new Error(`Could not fetch user ${userId}`);
      }

      // Check if we can send DMs to this user
      const canSendDM = await PermissionManager.canSendDM(user);
      if (!canSendDM) {
        logger.debug(`Cannot send DM to user ${user.tag} (${user.id})`);
        return null;
      }

      // Format user list
      const usernames = Array.from(currentUsers.values())
        .filter(member => !member.user.bot)
        .map(member => member.displayName || member.user.displayName);
      
      const formattedUserList = MessageFormatter.formatUserList(usernames, guildConfig.maxDisplayUsers);

      // Format notification message
      const messageContent = MessageFormatter.formatNotificationMessage(
        guildConfig.customMessage,
        {
          channelName: monitoredChannel.channelName,
          userList: formattedUserList,
          emoji: monitoredChannel.emoji
        }
      );

      // Send the DM
      const sentMessage = await user.send(messageContent);
      
      logger.debug(`Sent new DM to ${user.tag} (${user.id}) for channel ${monitoredChannel.channelName}`);
      return sentMessage;
    } catch (error) {
      logger.error(`Failed to send new DM to user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Handle failed message update by sending a new DM
   * @param {Object} notification - Notification state object
   * @param {Collection} currentUsers - Current users in channel
   * @param {Object} guildConfig - Guild configuration
   * @param {Object} monitoredChannel - Monitored channel data
   * @param {Function} updateNotificationCallback - Callback to update notification state
   * @returns {string|null} New message ID or null
   */
  async handleFailedMessageUpdate(notification, currentUsers, guildConfig, monitoredChannel, updateNotificationCallback) {
    try {
      // Send a new DM
      const newMessage = await this.sendNewDM(
        notification.userId,
        currentUsers,
        guildConfig,
        monitoredChannel
      );

      if (newMessage && updateNotificationCallback) {
        // Update the notification state with the new message ID
        await updateNotificationCallback(notification.id, newMessage.id);
        
        logger.info(`Replaced failed DM update with new message for user ${notification.userId}`);
        return newMessage.id;
      }

      return null;
    } catch (error) {
      logger.error(`Failed to handle failed message update for user ${notification.userId}:`, error);
      return null;
    }
  }

  /**
   * Add update to queue to handle rapid user joins/leaves
   * @param {string} key - Unique key for the update
   * @param {Function} updateFunction - Function to execute
   * @param {number} delay - Delay before processing (ms)
   */
  queueUpdate(key, updateFunction, delay = 1000) {
    // Clear existing timeout for this key
    if (this.updateQueue.has(key)) {
      clearTimeout(this.updateQueue.get(key).timeout);
    }

    // Set new timeout
    const timeout = setTimeout(async () => {
      try {
        await updateFunction();
        this.updateQueue.delete(key);
      } catch (error) {
        logger.error(`Error processing queued update for ${key}:`, error);
        this.updateQueue.delete(key);
      }
    }, delay);

    this.updateQueue.set(key, {
      updateFunction,
      timeout
    });

    logger.debug(`Queued update for ${key} with ${delay}ms delay`);
  }

  /**
   * Process all queued updates immediately
   */
  async flushQueue() {
    const promises = [];
    
    for (const [key, queueItem] of this.updateQueue.entries()) {
      clearTimeout(queueItem.timeout);
      promises.push(
        queueItem.updateFunction().catch(error => {
          logger.error(`Error flushing queued update for ${key}:`, error);
        })
      );
    }

    this.updateQueue.clear();
    await Promise.allSettled(promises);
    
    logger.debug('Flushed all queued updates');
  }

  /**
   * Clear all queued updates
   */
  clearQueue() {
    for (const queueItem of this.updateQueue.values()) {
      clearTimeout(queueItem.timeout);
    }
    this.updateQueue.clear();
    logger.debug('Cleared update queue');
  }

  /**
   * Get queue size for monitoring
   * @returns {number} Number of items in queue
   */
  getQueueSize() {
    return this.updateQueue.size;
  }
}

module.exports = new MessageUpdateService();
