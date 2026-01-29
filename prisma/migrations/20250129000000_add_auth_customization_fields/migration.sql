-- Add auth customization fields to service_settings table
ALTER TABLE "service_settings" ADD COLUMN IF NOT EXISTS "authLogoUrl" TEXT;
ALTER TABLE "service_settings" ADD COLUMN IF NOT EXISTS "authWelcomeHeading" TEXT NOT NULL DEFAULT 'your community';
ALTER TABLE "service_settings" ADD COLUMN IF NOT EXISTS "authTagline" TEXT NOT NULL DEFAULT 'Connect, worship, and grow together.';
ALTER TABLE "service_settings" ADD COLUMN IF NOT EXISTS "authFooterText" TEXT NOT NULL DEFAULT 'Faith · Community · Purpose';
