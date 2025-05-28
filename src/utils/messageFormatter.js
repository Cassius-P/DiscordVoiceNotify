const logger = require('./logger');

/**
 * Message formatting utilities for notifications
 */
class MessageFormatter {
  /**
   * Format user list for notifications
   * @param {Array<string>} usernames - Array of usernames
   * @param {number} maxDisplay - Maximum users to display
   * @returns {string} Formatted user list
   */
  static formatUserList(usernames, maxDisplay = 5) {
    if (!usernames || usernames.length === 0) {
      return 'No users';
    }

    if (usernames.length <= maxDisplay) {
      if (usernames.length === 1) {
        return usernames[0];
      } else if (usernames.length === 2) {
        return `${usernames[0]} and ${usernames[1]}`;
      } else {
        const lastUser = usernames.pop();
        return `${usernames.join(', ')}, and ${lastUser}`;
      }
    } else {
      const displayUsers = usernames.slice(0, maxDisplay);
      const remainingCount = usernames.length - maxDisplay;
      
      if (displayUsers.length === 1) {
        return `${displayUsers[0]} and ${remainingCount} other${remainingCount === 1 ? '' : 's'}`;
      } else {
        const lastDisplayUser = displayUsers.pop();
        return `${displayUsers.join(', ')}, ${lastDisplayUser}, and ${remainingCount} other${remainingCount === 1 ? '' : 's'}`;
      }
    }
  }

  /**
   * Format notification message
   * @param {string} template - Message template
   * @param {Object} data - Data for template replacement
   * @param {string} data.channelName - Voice channel name
   * @param {string} data.userList - Formatted user list
   * @param {string} data.emoji - Channel emoji
   * @returns {string} Formatted message
   */
  static formatNotificationMessage(template, { channelName, userList, emoji }) {
    try {
      let message = template;
      
      // Replace template variables
      message = message.replace(/\{channelName\}/g, channelName);
      message = message.replace(/\{userList\}/g, userList);
      message = message.replace(/\{emoji\}/g, emoji || '🔊');
      
      // Replace legacy template variables
      message = message.replace(/#\{channelName\}/g, channelName);
      
      return message;
    } catch (error) {
      logger.error('Error formatting notification message:', error);
      return `🔊 Users in ${channelName}: ${userList}`;
    }
  }

  /**
   * Create embed for configuration display
   * @param {Object} config - Guild configuration
   * @param {Array} monitoredChannels - Monitored channels
   * @returns {Object} Discord embed object
   */
  static createConfigEmbed(config, monitoredChannels = []) {
    const embed = {
      title: '⚙️ Bot Configuration',
      color: 0x0099ff,
      fields: [
        {
          name: 'Custom Message',
          value: `\`${config.customMessage}\``,
          inline: false
        },
        {
          name: 'Max Users',
          value: config.maxUsers.toString(),
          inline: true
        },
        {
          name: 'Max Display Users',
          value: config.maxDisplayUsers.toString(),
          inline: true
        },
        {
          name: 'Admin Role',
          value: config.adminRoleId ? `<@&${config.adminRoleId}>` : 'Not set',
          inline: true
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Discord Voice Notify Bot'
      }
    };

    if (monitoredChannels.length > 0) {
      const channelList = monitoredChannels.map(ch => 
        `${ch.emoji} <#${ch.channelId}>`
      ).join('\n');
      
      embed.fields.push({
        name: `Monitored Channels (${monitoredChannels.length})`,
        value: channelList,
        inline: false
      });
    } else {
      embed.fields.push({
        name: 'Monitored Channels',
        value: 'No channels configured',
        inline: false
      });
    }

    return embed;
  }

  /**
   * Create embed for subscription message
   * @param {Array} monitoredChannels - Available channels for subscription
   * @param {Object} textChannel - Text channel where message is sent
   * @returns {Object} Discord embed object
   */
  static createSubscriptionEmbed(monitoredChannels, textChannel) {
    const embed = {
      title: '🔔 Voice Channel Notifications',
      description: 'React with the emoji below to subscribe to notifications when users join these voice channels:',
      color: 0x00ff00,
      fields: [],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Click the reactions below to subscribe/unsubscribe'
      }
    };

    if (monitoredChannels.length > 0) {
      const channelList = monitoredChannels.map(ch => 
        `${ch.emoji} <#${ch.channelId}> - React with ${ch.emoji}`
      ).join('\n');
      
      embed.fields.push({
        name: 'Available Channels',
        value: channelList,
        inline: false
      });
    } else {
      embed.description = 'No voice channels are currently configured for monitoring.';
      embed.color = 0xff9900;
    }

    return embed;
  }

  /**
   * Create error embed
   * @param {string} title - Error title
   * @param {string} description - Error description
   * @returns {Object} Discord embed object
   */
  static createErrorEmbed(title, description) {
    return {
      title: `❌ ${title}`,
      description: description,
      color: 0xff0000,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Create success embed
   * @param {string} title - Success title
   * @param {string} description - Success description
   * @returns {Object} Discord embed object
   */
  static createSuccessEmbed(title, description) {
    return {
      title: `✅ ${title}`,
      description: description,
      color: 0x00ff00,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Validate and parse emoji
   * @param {string} emoji - Emoji string
   * @returns {Object} Parsed emoji data
   */
  static parseEmoji(emoji) {
    // Check if it's a custom emoji
    const customEmojiMatch = emoji.match(/<:(.*?):(\d+)>/);
    if (customEmojiMatch) {
      return {
        name: customEmojiMatch[1],
        id: customEmojiMatch[2],
        custom: true,
        toString: () => emoji
      };
    }

    // Check if it's a Unicode emoji
    const unicodeEmojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
    if (unicodeEmojiRegex.test(emoji)) {
      return {
        name: emoji,
        id: null,
        custom: false,
        toString: () => emoji
      };
    }

    // Default fallback
    return {
      name: '🔊',
      id: null,
      custom: false,
      toString: () => '🔊'
    };
  }
}

module.exports = MessageFormatter;
