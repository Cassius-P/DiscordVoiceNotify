const { Events } = require('discord.js');
const logger = require('../utils/logger');
const { commands } = require('../bot');
const PermissionManager = require('../utils/permissions');
const MessageFormatter = require('../utils/messageFormatter');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      await handleSlashCommand(interaction);
    }
  }
};

/**
 * Handle slash command interactions
 * @param {ChatInputCommandInteraction} interaction - Command interaction
 */
async function handleSlashCommand(interaction) {
  const command = commands.get(interaction.commandName);

  if (!command) {
    logger.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    // Check permissions for configuration commands
    if (interaction.commandName.startsWith('notify-config')) {
      const hasPermission = await PermissionManager.hasAdminPermissions(
        interaction.member, 
        interaction.guildId
      );

      if (!hasPermission) {
        const errorEmbed = MessageFormatter.createErrorEmbed(
          'Permission Denied',
          'You need Administrator permissions or the "Bot Admin" role to use this command.'
        );
        
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        return;
      }
    }

    // Execute the command
    await command.execute(interaction);
    
    logger.info(`Command ${interaction.commandName} executed by ${interaction.user.tag} in guild ${interaction.guild?.name}`);
  } catch (error) {
    logger.error(`Error executing command ${interaction.commandName}:`, error);

    const errorEmbed = MessageFormatter.createErrorEmbed(
      'Command Error',
      'There was an error while executing this command!'
    );

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }
    } catch (followUpError) {
      logger.error('Failed to send error message:', followUpError);
    }
  }
}
