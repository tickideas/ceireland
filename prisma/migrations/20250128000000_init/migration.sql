-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "RecurrenceType" AS ENUM ('NONE', 'DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "name" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "hlsUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "checkInTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banners" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "linkUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stream_settings" (
    "id" TEXT NOT NULL,
    "streamUrl" TEXT,
    "posterUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stream_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_settings" (
    "id" TEXT NOT NULL,
    "appName" TEXT NOT NULL DEFAULT 'Church App',
    "headerTitle" TEXT NOT NULL DEFAULT 'Church Service',
    "sundayLabel" TEXT NOT NULL DEFAULT 'Sunday',
    "sundayTime" TEXT NOT NULL DEFAULT '10:00 AM',
    "wednesdayLabel" TEXT NOT NULL DEFAULT 'Wednesday',
    "wednesdayTime" TEXT NOT NULL DEFAULT '7:00 PM',
    "prayerLabel" TEXT NOT NULL DEFAULT 'Prayer',
    "prayerTime" TEXT NOT NULL DEFAULT 'Daily 6:00 AM',
    "authBackgroundUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "viewer_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "viewer_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "open_events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "allowPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "open_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "open_event_attendance" (
    "id" TEXT NOT NULL,
    "openEventId" TEXT NOT NULL,
    "sessionId" TEXT,
    "userId" TEXT,
    "checkInTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "open_event_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_schedules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "time" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "recurrenceType" "RecurrenceType" NOT NULL DEFAULT 'WEEKLY',
    "dayOfWeek" "DayOfWeek",
    "dayOfMonth" INTEGER,
    "specificDate" TIMESTAMP(3),
    "color" TEXT NOT NULL DEFAULT 'blue',
    "icon" TEXT NOT NULL DEFAULT 'sun',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cta_settings" (
    "id" TEXT NOT NULL,
    "givingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "givingButtonLabel" TEXT NOT NULL DEFAULT 'Online Giving',
    "givingUrl" TEXT,
    "offlineGivingTitle" TEXT NOT NULL DEFAULT 'Offline Giving Details',
    "offlineGivingDetails" TEXT,
    "givingColorFrom" TEXT NOT NULL DEFAULT '#ec4899',
    "givingColorTo" TEXT NOT NULL DEFAULT '#f43f5e',
    "prayerEnabled" BOOLEAN NOT NULL DEFAULT true,
    "prayerButtonLabel" TEXT NOT NULL DEFAULT 'Prayer Request',
    "prayerFormTitle" TEXT NOT NULL DEFAULT 'Submit Your Prayer Request',
    "prayerFormDescription" TEXT,
    "prayerColorFrom" TEXT NOT NULL DEFAULT '#3b82f6',
    "prayerColorTo" TEXT NOT NULL DEFAULT '#6366f1',
    "salvationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "salvationButtonLabel" TEXT NOT NULL DEFAULT 'Accept Christ',
    "salvationTitle" TEXT NOT NULL DEFAULT 'Prayer of Salvation',
    "salvationPrayer" TEXT,
    "salvationConfirmText" TEXT NOT NULL DEFAULT 'I just said this prayer',
    "salvationColorFrom" TEXT NOT NULL DEFAULT '#f59e0b',
    "salvationColorTo" TEXT NOT NULL DEFAULT '#f97316',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cta_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prayer_requests" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "request" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prayer_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salvation_responses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "followedUp" BOOLEAN NOT NULL DEFAULT false,
    "followUpNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salvation_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_approved_idx" ON "users"("approved");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

-- CreateIndex
CREATE INDEX "users_approved_createdAt_idx" ON "users"("approved", "createdAt");

-- CreateIndex
CREATE INDEX "services_date_idx" ON "services"("date");

-- CreateIndex
CREATE INDEX "services_isActive_idx" ON "services"("isActive");

-- CreateIndex
CREATE INDEX "attendance_userId_idx" ON "attendance"("userId");

-- CreateIndex
CREATE INDEX "attendance_serviceId_idx" ON "attendance"("serviceId");

-- CreateIndex
CREATE INDEX "attendance_checkInTime_idx" ON "attendance"("checkInTime");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_userId_serviceId_key" ON "attendance"("userId", "serviceId");

-- CreateIndex
CREATE INDEX "banners_active_idx" ON "banners"("active");

-- CreateIndex
CREATE INDEX "banners_order_idx" ON "banners"("order");

-- CreateIndex
CREATE UNIQUE INDEX "viewer_sessions_sessionId_key" ON "viewer_sessions"("sessionId");

-- CreateIndex
CREATE INDEX "viewer_sessions_lastSeen_idx" ON "viewer_sessions"("lastSeen");

-- CreateIndex
CREATE INDEX "open_events_startDate_idx" ON "open_events"("startDate");

-- CreateIndex
CREATE INDEX "open_events_endDate_idx" ON "open_events"("endDate");

-- CreateIndex
CREATE INDEX "open_events_isActive_idx" ON "open_events"("isActive");

-- CreateIndex
CREATE INDEX "open_event_attendance_openEventId_idx" ON "open_event_attendance"("openEventId");

-- CreateIndex
CREATE INDEX "open_event_attendance_sessionId_idx" ON "open_event_attendance"("sessionId");

-- CreateIndex
CREATE INDEX "open_event_attendance_userId_idx" ON "open_event_attendance"("userId");

-- CreateIndex
CREATE INDEX "open_event_attendance_checkInTime_idx" ON "open_event_attendance"("checkInTime");

-- CreateIndex
CREATE UNIQUE INDEX "open_event_attendance_sessionId_openEventId_key" ON "open_event_attendance"("sessionId", "openEventId");

-- CreateIndex
CREATE UNIQUE INDEX "open_event_attendance_userId_openEventId_key" ON "open_event_attendance"("userId", "openEventId");

-- CreateIndex
CREATE INDEX "service_schedules_isActive_idx" ON "service_schedules"("isActive");

-- CreateIndex
CREATE INDEX "service_schedules_order_idx" ON "service_schedules"("order");

-- CreateIndex
CREATE INDEX "service_schedules_recurrenceType_idx" ON "service_schedules"("recurrenceType");

-- CreateIndex
CREATE INDEX "prayer_requests_isRead_idx" ON "prayer_requests"("isRead");

-- CreateIndex
CREATE INDEX "prayer_requests_isArchived_idx" ON "prayer_requests"("isArchived");

-- CreateIndex
CREATE INDEX "prayer_requests_createdAt_idx" ON "prayer_requests"("createdAt");

-- CreateIndex
CREATE INDEX "salvation_responses_followedUp_idx" ON "salvation_responses"("followedUp");

-- CreateIndex
CREATE INDEX "salvation_responses_createdAt_idx" ON "salvation_responses"("createdAt");

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viewer_sessions" ADD CONSTRAINT "viewer_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "open_event_attendance" ADD CONSTRAINT "open_event_attendance_openEventId_fkey" FOREIGN KEY ("openEventId") REFERENCES "open_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "open_event_attendance" ADD CONSTRAINT "open_event_attendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
