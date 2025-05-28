# Discord Voice Channel Notification Bot

A Discord bot that sends DM notifications when users join monitored voice channels. Users can subscribe to specific channels using reaction-based subscriptions.

## Features

- 🔔 **Voice Channel Monitoring**: Monitor specific voice channels for user activity
- 📱 **DM Notifications**: Send private messages when users join monitored channels
- 🔄 **Smart Message Updates**: Update existing DM messages instead of spam sending new ones
- ⚡ **Reaction Subscriptions**: Users subscribe by reacting to messages with emojis
- 🎯 **Session Management**: Track voice channel sessions and update messages dynamically
- ⚙️ **Configurable Settings**: Customize messages, user limits, and display preferences
- 🛡️ **Permission System**: Role-based access control for configuration commands
- 📊 **Rate Limiting**: Built-in rate limiting to prevent spam
- 🗄️ **Database Storage**: PostgreSQL database with session tracking

## Quick Start

### Prerequisites

- Node.js 16.0.0 or higher
- PostgreSQL database (recommend Supabase)
- Discord Bot Token

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd discord-voice-notify
   ```




2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Copy `.env` and fill in your values:
   ```env
   DISCORD_TOKEN=your_bot_token_here
   DATABASE_URL=your_postgresql_connection_string
   NODE_ENV=development
   ```

4. **Set up the database**
   ```bash
   npm run prisma:migrate
   npm run prisma:generate
   ```

5. **Start the bot**
   ```bash
   npm start
   ```

### Discord Bot Setup

1. Create a new application at [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a bot user and copy the token
3. Invite the bot to your server with these permissions:
   - `Send Messages`
   - `Add Reactions`
   - `View Channels`
   - `Use Slash Commands`
   - `Send Messages in Threads`
   - `Read Message History`

**Invite URL Template:**
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_BOT_ID&permissions=274877908032&scope=bot%20applications.commands
```

## Usage

### Initial Setup

1. **Configure the bot**
   ```
   /notify-config setup
   ```
   This creates the "Bot Admin" role and initializes guild settings.

2. **Add voice channels to monitor**
   ```
   /notify-config add-channel voice-channel:#your-voice-channel emoji:🎮
   ```

3. **Create subscription message**
   ```
   /notify init text-channel:#notifications
   ```

### User Subscription

Users can subscribe to notifications by:
1. Finding the subscription message created by `/notify init`
2. Reacting with the emoji corresponding to their desired voice channel
3. Removing the reaction to unsubscribe

### DM Message Behavior

The bot intelligently manages DM notifications with **session-based message updates**:

**New Session (Empty Channel → Occupied):**
- When the first user joins an empty monitored channel, new DM messages are sent to all subscribers
- A new "session" is created to track this voice channel activity

**Continuing Session (Users Join/Leave):**
- When additional users join or leave the channel, existing DM messages are **updated** instead of sending new messages
- This prevents DM spam and keeps a clean, current view of channel activity
- Only subscribers **not currently in the channel** receive notifications

**Session End (Channel Becomes Empty):**
- When all users leave the channel, the session ends
- The next user to join will start a new session with fresh DM messages

**Example Flow:**
1. Alice joins "Gaming" → New DMs sent: "🎮 Users in Gaming: Alice"
2. Bob joins "Gaming" → Existing DMs updated: "🎮 Users in Gaming: Alice and Bob"  
3. Charlie joins "Gaming" → Existing DMs updated: "🎮 Users in Gaming: Alice, Bob, and Charlie"
4. All users leave → Session ends
5. David joins "Gaming" → New DMs sent: "🎮 Users in Gaming: David"

### Configuration Commands

| Command | Description |
|---------|-------------|
| `/notify-config setup` | Initial bot setup |
| `/notify-config message <text>` | Set custom notification message |
| `/notify-config add-channel <channel> <emoji>` | Add voice channel to monitor |
| `/notify-config remove-channel <channel>` | Remove monitored channel |
| `/notify-config max-users <number>` | Set user limit for notifications |
| `/notify-config max-display <number>` | Set max users shown in messages |
| `/notify-config list` | Show current configuration |

### Message Templates

Customize notification messages using these placeholders:
- `{channelName}` - Voice channel name
- `{userList}` - Formatted list of users
- `{emoji}` - Channel emoji

**Example:**
```
{emoji} Activity in {channelName}: {userList}
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DISCORD_TOKEN` | Discord bot token | Required |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `NODE_ENV` | Environment (development/production) | development |

### Default Settings

- **Max Users**: 10 (notifications stop when exceeded)
- **Max Display Users**: 5 (users shown in notification)
- **Custom Message**: "🔊 Users in {channelName}: {userList}"
- **Rate Limit**: 5 seconds between notifications per user

## Database Schema

The bot uses PostgreSQL with Prisma ORM and includes session management:

- **Guild**: Server configurations and settings
- **MonitoredChannel**: Voice channels being monitored
- **UserSubscription**: User subscriptions to channels
- **NotificationState**: DM message tracking with session support
- **ChannelSession**: Voice channel session management for message updates

## Development

### Scripts

```bash
npm start                     # Start the bot
npm run dev                   # Start with file watching
npm run test-dm-modification  # Test DM message modification features
npm run prisma:migrate        # Run database migrations
npm run prisma:generate       # Generate Prisma client
npm run prisma:studio         # Open database browser
```

### Project Structure

```
src/
├── bot.js                 # Main bot file
├── commands/              # Slash commands
│   ├── config.js         # Configuration commands
│   ├── notify.js         # Notification commands
│   └── index.js          # Commands index
├── events/               # Event handlers
│   ├── ready.js          # Bot ready event
│   ├── voiceStateUpdate.js # Voice channel events
│   ├── messageReactionAdd.js # Reaction events
│   └── ...
├── services/             # Business logic
│   ├── notificationService.js # Notification handling
│   └── subscriptionService.js # Subscription management
├── utils/                # Utilities
│   ├── logger.js         # Winston logging
│   ├── permissions.js    # Permission checking
│   └── messageFormatter.js # Message formatting
└── database/
    └── client.js         # Database client
```

## Troubleshooting

### Common Issues

**Bot not responding to commands:**
- Ensure bot has `Use Slash Commands` permission
- Check if commands are registered (look for logs on startup)

**Cannot send DMs:**
- Some users have DMs disabled
- Bot logs will show these failures

**Database connection issues:**
- Verify `DATABASE_URL` is correct
- Ensure database is accessible
- Check Prisma migration status

**Permission errors:**
- Verify bot has required permissions in channels
- Check if "Bot Admin" role exists and is assigned

### Logs

Logs are stored in:
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only
- Console output in development mode

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

For support and questions:
- Check the troubleshooting section
- Review the logs for error details
- Open an issue on GitHub

---

**Note**: This bot requires careful permission management. Always test in a development server first.
