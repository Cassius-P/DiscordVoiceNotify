/*
  Warnings:

  - The `userList` column on the `notification_states` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[guildId,channelId,userId,sessionId]` on the table `notification_states` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `sessionId` to the `notification_states` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "notification_states_guildId_channelId_userId_key";

-- AlterTable
ALTER TABLE "guilds" ALTER COLUMN "customMessage" SET DEFAULT '🔊 Users in {channelName}: {userList}';

-- AlterTable
ALTER TABLE "notification_states" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sessionId" VARCHAR(50) NOT NULL,
DROP COLUMN "userList",
ADD COLUMN     "userList" JSONB;

-- CreateTable
CREATE TABLE "channel_sessions" (
    "id" TEXT NOT NULL,
    "guildId" VARCHAR(20) NOT NULL,
    "channelId" VARCHAR(20) NOT NULL,
    "sessionId" VARCHAR(50) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "channel_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "channel_sessions_sessionId_key" ON "channel_sessions"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "channel_sessions_guildId_channelId_isActive_key" ON "channel_sessions"("guildId", "channelId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "notification_states_guildId_channelId_userId_sessionId_key" ON "notification_states"("guildId", "channelId", "userId", "sessionId");

-- AddForeignKey
ALTER TABLE "notification_states" ADD CONSTRAINT "notification_states_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "channel_sessions"("sessionId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_sessions" ADD CONSTRAINT "channel_sessions_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_sessions" ADD CONSTRAINT "channel_sessions_channelId_guildId_fkey" FOREIGN KEY ("channelId", "guildId") REFERENCES "monitored_channels"("channelId", "guildId") ON DELETE CASCADE ON UPDATE CASCADE;
