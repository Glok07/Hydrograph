-- CreateEnum
CREATE TYPE "Lang" AS ENUM ('fr', 'fon', 'goun', 'yoruba');

-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('whatsapp', 'sms');

-- CreateEnum
CREATE TYPE "NotifStatus" AS ENUM ('pending', 'sent', 'failed');

-- CreateTable
CREATE TABLE "Subscriber" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "lang" "Lang" NOT NULL DEFAULT 'fr',
    "channel" "Channel" NOT NULL DEFAULT 'whatsapp',
    "members" INTEGER NOT NULL DEFAULT 4,
    "real" BOOLEAN NOT NULL DEFAULT false,
    "consent" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "unsubscribedAt" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NetworkEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "startsAt" INTEGER NOT NULL,
    "durationH" INTEGER NOT NULL,
    "pipe" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NetworkEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "eventId" TEXT,
    "zone" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "status" "NotifStatus" NOT NULL DEFAULT 'pending',
    "providerId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subscriber_phone_key" ON "Subscriber"("phone");

-- CreateIndex
CREATE INDEX "Subscriber_zone_idx" ON "Subscriber"("zone");

-- CreateIndex
CREATE INDEX "Notification_subscriberId_idx" ON "Notification"("subscriberId");

-- CreateIndex
CREATE INDEX "Notification_status_idx" ON "Notification"("status");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "Subscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "NetworkEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
