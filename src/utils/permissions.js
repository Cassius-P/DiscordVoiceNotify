const { PermissionFlagsBits } = require('discord.js');
const logger = require('./logger');
const databaseClient = require('../database/client');

/**
 * Permission utilities for command authorization
 */
class PermissionManager {
  /**
   * Check if user has bot admin permissions
   * @param {GuildMember} member - Discord guild member
   * @param {string} guildId - Guild ID
   * @returns {Promise<boolean>} True if user has permissions
   */
  static async hasAdminPermissions(member, guildId) {
    try {
      // Check if user is server administrator
      if (member.permissions.has(PermissionFlagsBits.Administrator)) {
        return true;
      }

      // Check if user has Bot Admin role
      const prisma = databaseClient.getClient();
      const guild = await prisma.guild.findUnique({
        where: { id: guildId }
      });

      if (guild?.adminRoleId) {
        const hasRole = member.roles.cache.has(guild.adminRoleId);
        return hasRole;
      }

      return false;
    } catch (error) {
      logger.error('Error checking admin permissions:', error);
      return false;
    }
  }

  /**
   * Check if bot has required permissions in a channel
   * @param {GuildChannel} channel - Discord channel
   * @param {Array<string>} permissions - Array of permission flags
   * @returns {boolean} True if bot has all permissions
   */
  static hasBotPermissions(channel, permissions = []) {
    try {
      const botMember = channel.guild.members.me;
      if (!botMember) return false;

      const channelPermissions = channel.permissionsFor(botMember);
      if (!channelPermissions) return false;

      // Default required permissions
      const requiredPerms = [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        ...permissions
      ];

      return channelPermissions.has(requiredPerms);
    } catch (error) {
      logger.error('Error checking bot permissions:', error);
      return false;
    }
  }

  /**
   * Check if bot can send DMs to a user
   * @param {User} user - Discord user
   * @returns {Promise<boolean>} True if DMs are allowed
   */
  static async canSendDM(user) {
    try {
      // Try to create a DM channel
      await user.createDM();
      return true;
    } catch (error) {
      logger.debug(`Cannot send DM to user ${user.id}:`, error.message);
      return false;
    }
  }

  /**
   * Create Bot Admin role for a guild
   * @param {Guild} guild - Discord guild
   * @returns {Promise<Role|null>} Created role or null if failed
   */
  static async createAdminRole(guild) {
    try {
      const role = await guild.roles.create({
        name: 'Bot Admin',
        color: 'Blue',
        reason: 'Bot setup - Admin role for voice notification bot',
        permissions: []
      });

      logger.info(`Created Bot Admin role in guild ${guild.id}`);
      return role;
    } catch (error) {
      logger.error(`Failed to create Bot Admin role in guild ${guild.id}:`, error);
      return null;
    }
  }

  /**
   * Validate if a role exists and is accessible
   * @param {Guild} guild - Discord guild
   * @param {string} roleId - Role ID to validate
   * @returns {boolean} True if role exists and is valid
   */
  static validateRole(guild, roleId) {
    try {
      const role = guild.roles.cache.get(roleId);
      return role !== undefined;
    } catch (error) {
      logger.error('Error validating role:', error);
      return false;
    }
  }

  /**
   * Get missing permissions for a channel
   * @param {GuildChannel} channel - Discord channel
   * @param {Array<string>} requiredPermissions - Required permission flags
   * @returns {Array<string>} Array of missing permissions
   */
  static getMissingPermissions(channel, requiredPermissions = []) {
    try {
      const botMember = channel.guild.members.me;
      if (!botMember) return requiredPermissions;

      const channelPermissions = channel.permissionsFor(botMember);
      if (!channelPermissions) return requiredPermissions;

      return requiredPermissions.filter(perm => !channelPermissions.has(perm));
    } catch (error) {
      logger.error('Error getting missing permissions:', error);
      return requiredPermissions;
    }
  }
}

module.exports = PermissionManager;
