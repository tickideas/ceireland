-- CreateTable
CREATE TABLE "stream_schedules" (
    "id" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "label" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stream_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stream_events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startDateTime" TIMESTAMP(3) NOT NULL,
    "endDateTime" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stream_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stream_schedules_dayOfWeek_idx" ON "stream_schedules"("dayOfWeek");

-- CreateIndex
CREATE INDEX "stream_schedules_isActive_idx" ON "stream_schedules"("isActive");

-- CreateIndex
CREATE INDEX "stream_events_startDateTime_idx" ON "stream_events"("startDateTime");

-- CreateIndex
CREATE INDEX "stream_events_endDateTime_idx" ON "stream_events"("endDateTime");

-- CreateIndex
CREATE INDEX "stream_events_isActive_idx" ON "stream_events"("isActive");
