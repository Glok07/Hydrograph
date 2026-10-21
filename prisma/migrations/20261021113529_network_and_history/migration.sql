-- CreateTable
CREATE TABLE "NetworkZone" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "households" INTEGER NOT NULL,
    "demand" INTEGER NOT NULL,
    "depth" INTEGER NOT NULL,
    "wells" BOOLEAN NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NetworkZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NetworkPipe" (
    "id" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,

    CONSTRAINT "NetworkPipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TowerConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,

    CONSTRAINT "TowerConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoryPoint" (
    "id" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "HistoryPoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HistoryPoint_zone_idx" ON "HistoryPoint"("zone");

-- CreateIndex
CREATE UNIQUE INDEX "HistoryPoint_zone_date_key" ON "HistoryPoint"("zone", "date");
