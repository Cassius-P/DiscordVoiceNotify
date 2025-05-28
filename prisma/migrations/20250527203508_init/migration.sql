-- CreateTable
CREATE TABLE "guilds" (
    "id" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "adminRoleId" VARCHAR(20),
    "customMessage" TEXT NOT NULL DEFAULT '🔊 Users in #{channelName}:',
    "maxUsers" INTEGER NOT NULL DEFAULT 10,
    "maxDisplayUsers" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guilds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitored_channels" (
    "id" TEXT NOT NULL,
    "guildId" VARCHAR(20) NOT NULL,
    "channelId" VARCHAR(20) NOT NULL,
    "channelName" VARCHAR(100) NOT NULL,
    "emoji" VARCHAR(50) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monitored_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_subscriptions" (
    "id" TEXT NOT NULL,
    "guildId" VARCHAR(20) NOT NULL,
    "userId" VARCHAR(20) NOT NULL,
    "channelId" VARCHAR(20) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_states" (
    "id" TEXT NOT NULL,
    "guildId" VARCHAR(20) NOT NULL,
    "channelId" VARCHAR(20) NOT NULL,
    "userId" VARCHAR(20) NOT NULL,
    "messageId" VARCHAR(20) NOT NULL,
    "userList" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "monitored_channels_guildId_channelId_key" ON "monitored_channels"("guildId", "channelId");

-- CreateIndex
CREATE UNIQUE INDEX "user_subscriptions_guildId_userId_channelId_key" ON "user_subscriptions"("guildId", "userId", "channelId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_states_guildId_channelId_userId_key" ON "notification_states"("guildId", "channelId", "userId");

-- AddForeignKey
ALTER TABLE "monitored_channels" ADD CONSTRAINT "monitored_channels_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_channelId_guildId_fkey" FOREIGN KEY ("channelId", "guildId") REFERENCES "monitored_channels"("channelId", "guildId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_states" ADD CONSTRAINT "notification_states_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_states" ADD CONSTRAINT "notification_states_channelId_guildId_fkey" FOREIGN KEY ("channelId", "guildId") REFERENCES "monitored_channels"("channelId", "guildId") ON DELETE CASCADE ON UPDATE CASCADE;
