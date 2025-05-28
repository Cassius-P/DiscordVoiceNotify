const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const logger = require('../utils/logger');
const MessageFormatter = require('../utils/messageFormatter');
const PermissionManager = require('../utils/permissions');
const subscriptionService = require('../services/subscriptionService');
const databaseClient = require('../database/client');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('notify')
    .setDescription('Manage notification subscriptions')
    .addSubcommand(subcommand =>
      subcommand
        .setName('init')
        .setDescription('Create subscription message with reactions')
        .addChannelOption(option =>
          option
            .setName('text-channel')
            .setDescription('Text channel to send subscription message')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    
    try {
      switch (subcommand) {
        case 'init':
          await handleInit(interaction);
          break;
        default:
          throw new Error(`Unknown subcommand: ${subcommand}`);
      }
    } catch (error) {
      logger.error(`Error in notify command ${subcommand}:`, error);
      throw error;
    }
  }
};

/**
 * Handle init subcommand
 */
async function handleInit(interaction) {
  await interaction.deferReply({ ephemeral: true });
  
  try {
    const textChannel = interaction.options.getChannel('text-channel');
    const guildId = interaction.guildId;
    const prisma = databaseClient.getClient();
    
    // Check if bot has permissions in the target channel
    const requiredPerms = [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions];
    const missingPerms = PermissionManager.getMissingPermissions(textChannel, requiredPerms);
    
    if (missingPerms.length > 0) {
      const errorEmbed = MessageFormatter.createErrorEmbed(
        'Missing Permissions',
        `Bot is missing the following permissions in ${textChannel}:\n${missingPerms.map(perm => `• ${perm}`).join('\n')}`
      );
      await interaction.editReply({ embeds: [errorEmbed] });
      return;
    }
    
    // Get monitored channels
    const monitoredChannels = await prisma.monitoredChannel.findMany({
      where: { guildId: guildId },
      orderBy: { channelName: 'asc' }
    });
    
    if (monitoredChannels.length === 0) {
      const errorEmbed = MessageFormatter.createErrorEmbed(
        'No Monitored Channels',
        'No voice channels are configured for monitoring. Use `/notify-config add-channel` to add channels first.'
      );
      await interaction.editReply({ embeds: [errorEmbed] });
      return;
    }
    
    // Validate that all voice channels still exist
    const validChannels = [];
    for (const monitoredChannel of monitoredChannels) {
      const voiceChannel = interaction.guild.channels.cache.get(monitoredChannel.channelId);
      if (voiceChannel) {
        validChannels.push(monitoredChannel);
      } else {
        // Clean up deleted channel
        await prisma.monitoredChannel.delete({
          where: { id: monitoredChannel.id }
        });
        logger.info(`Removed deleted voice channel ${monitoredChannel.channelName} from monitoring`);
      }
    }
    
    if (validChannels.length === 0) {
      const errorEmbed = MessageFormatter.createErrorEmbed(
        'No Valid Channels',
        'All monitored voice channels have been deleted. Use `/notify-config add-channel` to add new channels.'
      );
      await interaction.editReply({ embeds: [errorEmbed] });
      return;
    }
    
    // Create subscription message
    try {
      const message = await subscriptionService.createSubscriptionMessage(textChannel, validChannels);
      
      const successEmbed = MessageFormatter.createSuccessEmbed(
        'Subscription Message Created',
        `Created subscription message in ${textChannel} with ${validChannels.length} channels.\n\nUsers can now react with emojis to subscribe to notifications!`
      );
      
      await interaction.editReply({ embeds: [successEmbed] });
      
      logger.info(`Created subscription message in ${textChannel.name} (${textChannel.id}) for guild ${interaction.guild.name}`);
    } catch (error) {
      logger.error('Failed to create subscription message:', error);
      
      const errorEmbed = MessageFormatter.createErrorEmbed(
        'Message Creation Failed',
        `Failed to create subscription message: ${error.message}`
      );
      await interaction.editReply({ embeds: [errorEmbed] });
    }
  } catch (error) {
    const errorEmbed = MessageFormatter.createErrorEmbed(
      'Command Failed',
      `Failed to initialize notifications: ${error.message}`
    );
    await interaction.editReply({ embeds: [errorEmbed] });
  }
}
