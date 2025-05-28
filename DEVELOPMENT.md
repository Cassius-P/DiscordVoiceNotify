# Development Commands Reference

## NPM Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start the bot in production mode |
| `npm run dev` | Start the bot with file watching for development |
| `npm run test-setup` | Validate environment and setup |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run database migrations |
| `npm run prisma:studio` | Open Prisma Studio (database browser) |

## Bot Commands

### Configuration Commands (Admin Only)

| Command | Description | Example |
|---------|-------------|---------|
| `/notify-config setup` | Initial bot setup | `/notify-config setup` |
| `/notify-config message <text>` | Set notification message | `/notify-config message {emoji} Users in {channelName}: {userList}` |
| `/notify-config add-channel <channel> <emoji>` | Add monitored channel | `/notify-config add-channel #gaming 🎮` |
| `/notify-config remove-channel <channel>` | Remove monitored channel | `/notify-config remove-channel #gaming` |
| `/notify-config max-users <number>` | Set max users limit | `/notify-config max-users 15` |
| `/notify-config max-display <number>` | Set max displayed users | `/notify-config max-display 8` |
| `/notify-config list` | Show current config | `/notify-config list` |

### Notification Commands (Admin Only)

| Command | Description | Example |
|---------|-------------|---------|
| `/notify init <channel>` | Create subscription message | `/notify init #notifications` |

## Message Template Variables

Use these in your custom notification messages:

| Variable | Description | Example Output |
|----------|-------------|----------------|
| `{channelName}` | Voice channel name | "Gaming Room" |
| `{userList}` | Formatted user list | "John, Jane, and 3 others" |
| `{emoji}` | Channel emoji | "🎮" |

## Database Management

### View Data
```powershell
npm run prisma:studio
```

### Reset Database
```powershell
npx prisma migrate reset
npm run prisma:generate
```

### Create Migration
```powershell
npx prisma migrate dev --name "description"
```

## Development Tips

### Logs Location
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only
- Console output in development

### Testing Locally
1. Create a test Discord server
2. Add the bot with all permissions
3. Test all commands and features
4. Monitor logs for any issues

### Environment Setup
- Use `.env` for local development
- Never commit real tokens to version control
- Use `NODE_ENV=development` for verbose logging

### File Watching
Use `npm run dev` to automatically restart the bot when files change during development.

## Production Deployment

### Environment Variables
```env
DISCORD_TOKEN=your_production_token
DATABASE_URL=your_production_database_url
NODE_ENV=production
```

### Process Management
Consider using PM2 for production:
```powershell
npm install -g pm2
pm2 start src/bot.js --name "discord-voice-bot"
pm2 startup
pm2 save
```

### Database Backups
Regular backups are recommended for production databases.
