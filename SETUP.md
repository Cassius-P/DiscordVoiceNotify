# Discord Voice Notification Bot - Setup Guide

This guide will help you get your Discord Voice Notification Bot up and running.

## Prerequisites

- Node.js 16.0.0 or higher
- A Discord Bot Token
- A PostgreSQL database (Supabase recommended)

## Step 1: Environment Configuration

1. Copy the example environment file:
   ```powershell
   Copy-Item .env.example .env
   ```

2. Edit `.env` and replace the placeholder values:
   ```env
   # Your Discord bot token from https://discord.com/developers/applications
   DISCORD_TOKEN=your_actual_bot_token_here
   
   # Your PostgreSQL connection string
   # For Supabase: postgresql://postgres.xxx:password@xxx.supabase.co:5432/postgres
   DATABASE_URL=your_actual_database_url_here
   
   # Environment
   NODE_ENV=development
   ```

## Step 2: Create Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to "Bot" section
4. Click "Add Bot"
5. Copy the token and add it to your `.env` file
6. Enable these Privileged Gateway Intents:
   - ✅ Server Members Intent (if you want member info)
   - ✅ Message Content Intent

## Step 3: Database Setup

### Option A: Supabase (Recommended)

1. Go to [Supabase](https://supabase.com)
2. Create a new project
3. Go to Settings > Database
4. Copy the connection string and add it to your `.env` file

### Option B: Local PostgreSQL

1. Install PostgreSQL locally
2. Create a database: `createdb discord_voice_notify`
3. Use connection string: `postgresql://username:password@localhost:5432/discord_voice_notify`

## Step 4: Install Dependencies and Setup Database

```powershell
# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate
```

## Step 5: Invite Bot to Server

1. Go to OAuth2 > URL Generator in Discord Developer Portal
2. Select scopes:
   - ✅ `bot`
   - ✅ `applications.commands`
3. Select bot permissions:
   - ✅ Send Messages
   - ✅ Add Reactions
   - ✅ View Channels
   - ✅ Use Slash Commands
   - ✅ Read Message History
4. Copy the generated URL and open it to invite the bot

## Step 6: Test Setup

Run the setup validation:
```powershell
npm run test-setup
```

If all tests pass, you're ready to start the bot!

## Step 7: Start the Bot

```powershell
npm start
```

Or for development with auto-restart:
```powershell
npm run dev
```

## Step 8: Configure the Bot

1. In your Discord server, run:
   ```
   /notify-config setup
   ```

2. Add voice channels to monitor:
   ```
   /notify-config add-channel voice-channel:#your-voice-channel emoji:🎮
   ```

3. Create subscription message:
   ```
   /notify init text-channel:#notifications
   ```

## Troubleshooting

### Common Issues

**"Missing required environment variables"**
- Make sure your `.env` file has valid values for `DISCORD_TOKEN` and `DATABASE_URL`

**"Database connection failed"**
- Verify your `DATABASE_URL` is correct
- Ensure your database is accessible
- For Supabase, make sure you're using the direct connection string

**"Bot not responding to commands"**
- Make sure the bot is online in your server
- Verify the bot has proper permissions
- Check if slash commands are registered (restart the bot)

**"Cannot send DMs"**
- Some users have DMs disabled from server members
- This is normal behavior and will be logged

### Getting Help

1. Check the logs in the `logs/` directory
2. Run `npm run test-setup` to validate your configuration
3. Review the README.md for detailed documentation

## Next Steps

Once your bot is running:

1. Configure multiple voice channels with different emojis
2. Customize notification messages with placeholders
3. Set user limits and display preferences
4. Create multiple subscription messages in different channels

Your bot is now ready to notify users when people join monitored voice channels!
