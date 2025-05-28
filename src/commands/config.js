const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const logger = require('../utils/logger');
const MessageFormatter = require('../utils/messageFormatter');
const PermissionManager = require('../utils/permissions');
const databaseClient = require('../database/client');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('notify-config')
    .setDescription('Configure the voice notification bot')
    .addSubcommand(subcommand =>
      subcommand
        .setName('setup')
        .setDescription('Initial bot setup (creates admin role, sets defaults)')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('message')
        .setDescription('Set custom notification message')
        .addStringOption(option =>
          option
            .setName('text')
            .setDescription('Custom message template (use {channelName} and {userList})')
            .setRequired(true)
            .setMaxLength(500)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('add-channel')
        .setDescription('Add voice channel to monitor')
        .addChannelOption(option =>
          option
            .setName('voice-channel')
            .setDescription('Voice channel to monitor')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildVoice)
        )
        .addStringOption(option =>
          option
            .setName('emoji')
            .setDescription('Emoji for reaction subscriptions')
            .setRequired(true)
            .setMaxLength(50)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove-channel')
        .setDescription('Remove monitored voice channel')
        .addChannelOption(option =>
          option
            .setName('voice-channel')
            .setDescription('Voice channel to remove')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildVoice)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('max-users')
        .setDescription('Set maximum users limit for notifications')
        .addIntegerOption(option =>
          option
            .setName('number')
            .setDescription('Maximum number of users (1-50)')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(50)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('max-display')
        .setDescription('Set maximum users to display in notifications')
        .addIntegerOption(option =>
          option
            .setName('number')
            .setDescription('Maximum users to display (1-20)')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(20)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('Show current configuration')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    
    try {
      switch (subcommand) {
        case 'setup':
          await handleSetup(interaction);
          break;
        case 'message':
          await handleMessage(interaction);
          break;
        case 'add-channel':
          await handleAddChannel(interaction);
          break;
        case 'remove-channel':
          await handleRemoveChannel(interaction);
          break;
        case 'max-users':
          await handleMaxUsers(interaction);
          break;
        case 'max-display':
          await handleMaxDisplay(interaction);
          break;
        case 'list':
          await handleList(interaction);
          break;
        default:
          throw new Error(`Unknown subcommand: ${subcommand}`);
      }
    } catch (error) {
      logger.error(`Error in config command ${subcommand}:`, error);
      throw error;
    }
  }
};

/**
 * Handle setup subcommand
 */
async function handleSetup(interaction) {
  await interaction.deferReply();
  
  try {
    const guild = interaction.guild;
    const prisma = databaseClient.getClient();
    
    // Create Bot Admin role
    const adminRole = await PermissionManager.createAdminRole(guild);
    if (!adminRole) {
      throw new Error('Failed to create Bot Admin role');
    }
    
    // Create or update guild configuration
    const guildConfig = await prisma.guild.upsert({
      where: { id: guild.id },
      update: {
        name: guild.name,
        adminRoleId: adminRole.id
      },
      create: {
        id: guild.id,
        name: guild.name,
        adminRoleId: adminRole.id,
        customMessage: '🔊 Users in {channelName}: {userList}',
        maxUsers: 10,
        maxDisplayUsers: 5
      }
    });
    
    const successEmbed = MessageFormatter.createSuccessEmbed(
      'Bot Setup Complete',
      `✅ Created "Bot Admin" role\n✅ Guild configuration initialized\n\nNext steps:\n1. Use \`/notify-config add-channel\` to add voice channels\n2. Use \`/notify init\` to create subscription messages`
    );
    
    await interaction.editReply({ embeds: [successEmbed] });
    logger.info(`Bot setup completed for guild ${guild.name} (${guild.id})`);
  } catch (error) {
    const errorEmbed = MessageFormatter.createErrorEmbed(
      'Setup Failed',
      `Failed to complete bot setup: ${error.message}`
    );
    await interaction.editReply({ embeds: [errorEmbed] });
  }
}

/**
 * Handle message subcommand
 */
async function handleMessage(interaction) {
  await interaction.deferReply();
  
  try {
    const message = interaction.options.getString('text');
    const guildId = interaction.guildId;
    const prisma = databaseClient.getClient();
    
    await prisma.guild.upsert({
      where: { id: guildId },
      update: { customMessage: message },
      create: {
        id: guildId,
        name: interaction.guild.name,
        customMessage: message,
        maxUsers: 10,
        maxDisplayUsers: 5
      }
    });
    
    const successEmbed = MessageFormatter.createSuccessEmbed(
      'Message Updated',
      `Custom notification message set to:\n\`${message}\``
    );
    
    await interaction.editReply({ embeds: [successEmbed] });
  } catch (error) {
    const errorEmbed = MessageFormatter.createErrorEmbed(
      'Update Failed',
      `Failed to update message: ${error.message}`
    );
    await interaction.editReply({ embeds: [errorEmbed] });
  }
}

/**
 * Handle add-channel subcommand
 */
async function handleAddChannel(interaction) {
  await interaction.deferReply();
  
  try {
    const channel = interaction.options.getChannel('voice-channel');
    const emoji = interaction.options.getString('emoji');
    const guildId = interaction.guildId;
    const prisma = databaseClient.getClient();
    
    // Validate emoji
    const parsedEmoji = MessageFormatter.parseEmoji(emoji);
    
    // Ensure guild exists
    await prisma.guild.upsert({
      where: { id: guildId },
      update: { name: interaction.guild.name },
      create: {
        id: guildId,
        name: interaction.guild.name,
        customMessage: '🔊 Users in {channelName}: {userList}',
        maxUsers: 10,
        maxDisplayUsers: 5
      }
    });
    
    // Add monitored channel
    await prisma.monitoredChannel.upsert({
      where: {
        guildId_channelId: {
          guildId: guildId,
          channelId: channel.id
        }
      },
      update: {
        channelName: channel.name,
        emoji: parsedEmoji.toString()
      },
      create: {
        guildId: guildId,
        channelId: channel.id,
        channelName: channel.name,
        emoji: parsedEmoji.toString()
      }
    });
    
    const successEmbed = MessageFormatter.createSuccessEmbed(
      'Channel Added',
      `Voice channel ${channel} is now monitored with emoji ${parsedEmoji.toString()}`
    );
    
    await interaction.editReply({ embeds: [successEmbed] });
  } catch (error) {
    const errorEmbed = MessageFormatter.createErrorEmbed(
      'Add Channel Failed',
      `Failed to add channel: ${error.message}`
    );
    await interaction.editReply({ embeds: [errorEmbed] });
  }
}

/**
 * Handle remove-channel subcommand
 */
async function handleRemoveChannel(interaction) {
  await interaction.deferReply();
  
  try {
    const channel = interaction.options.getChannel('voice-channel');
    const guildId = interaction.guildId;
    const prisma = databaseClient.getClient();
    
    const deleted = await prisma.monitoredChannel.deleteMany({
      where: {
        guildId: guildId,
        channelId: channel.id
      }
    });
    
    if (deleted.count === 0) {
      const errorEmbed = MessageFormatter.createErrorEmbed(
        'Channel Not Found',
        `Channel ${channel} is not currently being monitored.`
      );
      await interaction.editReply({ embeds: [errorEmbed] });
      return;
    }
    
    const successEmbed = MessageFormatter.createSuccessEmbed(
      'Channel Removed',
      `Voice channel ${channel} is no longer monitored.`
    );
    
    await interaction.editReply({ embeds: [successEmbed] });
  } catch (error) {
    const errorEmbed = MessageFormatter.createErrorEmbed(
      'Remove Channel Failed',
      `Failed to remove channel: ${error.message}`
    );
    await interaction.editReply({ embeds: [errorEmbed] });
  }
}

/**
 * Handle max-users subcommand
 */
async function handleMaxUsers(interaction) {
  await interaction.deferReply();
  
  try {
    const maxUsers = interaction.options.getInteger('number');
    const guildId = interaction.guildId;
    const prisma = databaseClient.getClient();
    
    await prisma.guild.upsert({
      where: { id: guildId },
      update: { maxUsers: maxUsers },
      create: {
        id: guildId,
        name: interaction.guild.name,
        customMessage: '🔊 Users in {channelName}: {userList}',
        maxUsers: maxUsers,
        maxDisplayUsers: 5
      }
    });
    
    const successEmbed = MessageFormatter.createSuccessEmbed(
      'Max Users Updated',
      `Maximum users limit set to ${maxUsers}`
    );
    
    await interaction.editReply({ embeds: [successEmbed] });
  } catch (error) {
    const errorEmbed = MessageFormatter.createErrorEmbed(
      'Update Failed',
      `Failed to update max users: ${error.message}`
    );
    await interaction.editReply({ embeds: [errorEmbed] });
  }
}

/**
 * Handle max-display subcommand
 */
async function handleMaxDisplay(interaction) {
  await interaction.deferReply();
  
  try {
    const maxDisplay = interaction.options.getInteger('number');
    const guildId = interaction.guildId;
    const prisma = databaseClient.getClient();
    
    await prisma.guild.upsert({
      where: { id: guildId },
      update: { maxDisplayUsers: maxDisplay },
      create: {
        id: guildId,
        name: interaction.guild.name,
        customMessage: '🔊 Users in {channelName}: {userList}',
        maxUsers: 10,
        maxDisplayUsers: maxDisplay
      }
    });
    
    const successEmbed = MessageFormatter.createSuccessEmbed(
      'Max Display Updated',
      `Maximum display users set to ${maxDisplay}`
    );
    
    await interaction.editReply({ embeds: [successEmbed] });
  } catch (error) {
    const errorEmbed = MessageFormatter.createErrorEmbed(
      'Update Failed',
      `Failed to update max display: ${error.message}`
    );
    await interaction.editReply({ embeds: [errorEmbed] });
  }
}

/**
 * Handle list subcommand
 */
async function handleList(interaction) {
  await interaction.deferReply();
  
  try {
    const guildId = interaction.guildId;
    const prisma = databaseClient.getClient();
    
    const [guildConfig, monitoredChannels] = await Promise.all([
      prisma.guild.findUnique({ where: { id: guildId } }),
      prisma.monitoredChannel.findMany({ where: { guildId: guildId } })
    ]);
    
    if (!guildConfig) {
      const errorEmbed = MessageFormatter.createErrorEmbed(
        'Not Configured',
        'Bot is not configured for this server. Run `/notify-config setup` first.'
      );
      await interaction.editReply({ embeds: [errorEmbed] });
      return;
    }
    
    const configEmbed = MessageFormatter.createConfigEmbed(guildConfig, monitoredChannels);
    await interaction.editReply({ embeds: [configEmbed] });
  } catch (error) {
    const errorEmbed = MessageFormatter.createErrorEmbed(
      'List Failed',
      `Failed to retrieve configuration: ${error.message}`
    );
    await interaction.editReply({ embeds: [errorEmbed] });
  }
}
