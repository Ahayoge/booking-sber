-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'ROOM_OWNER';

-- CreateTable
CREATE TABLE "RoomOwnership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomOwnership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomSchedule" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "openTime" TEXT NOT NULL,
    "closeTime" TEXT NOT NULL,

    CONSTRAINT "RoomSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomBlockedSlot" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomBlockedSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoomOwnership_roomId_idx" ON "RoomOwnership"("roomId");

-- CreateIndex
CREATE INDEX "RoomOwnership_userId_idx" ON "RoomOwnership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RoomOwnership_userId_roomId_key" ON "RoomOwnership"("userId", "roomId");

-- CreateIndex
CREATE UNIQUE INDEX "RoomSchedule_roomId_dayOfWeek_key" ON "RoomSchedule"("roomId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "RoomBlockedSlot_roomId_startTime_idx" ON "RoomBlockedSlot"("roomId", "startTime");

-- AddForeignKey
ALTER TABLE "RoomOwnership" ADD CONSTRAINT "RoomOwnership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomOwnership" ADD CONSTRAINT "RoomOwnership_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomSchedule" ADD CONSTRAINT "RoomSchedule_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomBlockedSlot" ADD CONSTRAINT "RoomBlockedSlot_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
