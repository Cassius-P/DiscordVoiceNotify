@echo off
echo Starting Discord Voice Notification Bot...
echo.

REM Check if .env file exists
if not exist .env (
    echo ERROR: .env file not found!
    echo Please copy .env.example to .env and configure your settings.
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist node_modules (
    echo Installing dependencies...
    npm install
    echo.
)

REM Generate Prisma client if needed
echo Generating Prisma client...
npx prisma generate
echo.

REM Start the bot
echo Starting bot...
npm start
