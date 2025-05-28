# Discord Voice Channel Notification Bot - Development Prompt

Create a Discord bot in JavaScript with the following specifications and architecture:

## Project Setup & Dependencies

**Initialize a Node.js project with these dependencies:**
- `discord.js` (latest v14)
- `@prisma/client` and `prisma` (for PostgreSQL ORM)
- `dotenv` (environment variables)
- `winston` (logging)

**Environment Variables (.env file):**
```env
DISCORD_TOKEN=your_bot_token
DATABASE_URL=your_supabase_postgresql_url
NODE_ENV=development
```

## Suggested File Structure

```
<root>/
├── src/
│   ├── commands/
│   │   ├── notify.js
│   │   ├── config.js
│   │   └── index.js
│   ├── events/
│   │   ├── ready.js
│   │   ├── voiceStateUpdate.js
│   │   ├── messageReactionAdd.js
│   │   └── index.js
│   ├── utils/
│   │   ├── logger.js
│   │   ├── permissions.js
│   │   └── messageFormatter.js
│   ├── services/
│   │   ├── notificationService.js
│   │   └── subscriptionService.js
│   ├── database/
│   │   └── client.js
│   └── bot.js
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── package.json
├── .env
└── README.md
```

## Database Schema (Prisma)

Design the following tables:

### 1. Guild
Store server-specific settings

### 2. MonitoredChannel
Voice channels to monitor per guild

### 3. UserSubscription
User subscription to specific channels

### 4. NotificationState
Track active notifications for message updates

**Required fields:**
- **Guild**: id, name, adminRoleId, customMessage, maxUsers, maxDisplayUsers
- **MonitoredChannel**: id, guildId, channelId, channelName, emoji
- **UserSubscription**: id, guildId, userId, channelId
- **NotificationState**: id, guildId, channelId, userId, messageId, userList, lastUpdated

## Bot Features & Commands

### Slash Commands

1. **`/notify-config setup`** - Initial bot setup (creates admin role, sets defaults)
2. **`/notify-config message <text>`** - Set custom notification message
3. **`/notify-config add-channel <voice-channel> <emoji>`** - Add voice channel to monitor
4. **`/notify-config remove-channel <voice-channel>`** - Remove monitored voice channel
5. **`/notify-config max-users <number>`** - Set maxUsers limit
6. **`/notify-config max-display <number>`** - Set maxDisplayUsers limit
7. **`/notify-config list`** - Show current configuration
8. **`/notify init <text-channel>`** - Create subscription message with reactions

### Permission System

- Create a role named "Bot Admin" when `/config setup` is run
- Allow server administrators to use commands by default
- Check for "Bot Admin" role or administrator permissions for all config commands

## Core Functionality

### Voice Channel Monitoring

- Listen to `voiceStateUpdate` events
- When user joins a monitored channel:
  - Check if channel has fewer users than `maxUsers`
  - Get all subscribers for that channel
  - Send DM notifications with current user list
  - Format: "🔊 Users in #channel-name: John, Jane, and 3 others" (respect `maxDisplayUsers`)

### Subscription Management

- Handle reactions on notification init messages
- Add/remove user subscriptions based on emoji reactions
- Auto-add bot reactions to init messages for each monitored channel

### Message Updates (Future Feature - Set up architecture)

- Track notification states in database
- Prepare structure for message editing when users join/leave
- For now, always send new messages

## Error Handling Requirements

1. **Graceful DM Failures**: Catch and log DM send failures, continue processing other users
2. **Channel Deletion**: Remove deleted channels from monitored channels table
3. **Role/Permission Errors**: Handle missing permissions gracefully with user feedback
4. **Database Errors**: Implement try-catch blocks with proper error logging

## Logging Setup (Winston)

Configure Winston with:
- Console transport for development
- File transport for production
- Info level logging
- Format: timestamp, level, message, metadata

**Log these events:**
- Bot startup/shutdown
- Command executions
- Voice channel joins/leaves
- DM send successes/failures
- Database operations
- Configuration changes

## Additional Implementation Notes

1. **Startup Sequence**: Load all guild configurations and monitored channels into memory for performance
2. **Emoji Validation**: Ensure emojis are valid Discord emojis or custom server emojis
3. **Rate Limiting**: Implement basic rate limiting for notification sending
4. **Clean Shutdown**: Handle SIGTERM/SIGINT for graceful database disconnection
5. **Validation**: Validate all user inputs for slash commands
6. **Help System**: Include descriptions and examples in slash command definitions

## Development Checklist

- [ ] Set up project structure and dependencies
- [ ] Configure Prisma with PostgreSQL
- [ ] Implement database models and migrations
- [ ] Create bot client with proper intents
- [ ] Implement slash command registration
- [ ] Build configuration commands with permission checks
- [ ] Create voice state update handler
- [ ] Implement notification service
- [ ] Add reaction-based subscription system
- [ ] Set up Winston logging
- [ ] Add comprehensive error handling
- [ ] Test all commands and features
- [ ] Create README with setup instructions

## Important Notes

Make the code production-ready with proper error handling, logging, and clean architecture patterns. Use async/await throughout and implement proper TypeScript-style JSDoc comments for better IDE support.

The bot should be resilient to failures and provide clear feedback to users when operations succeed or fail. All database operations should be wrapped in proper error handling, and the bot should gracefully handle Discord API rate limits and temporary outages.