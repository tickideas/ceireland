-- Add SEO fields to service_settings table
ALTER TABLE "service_settings" ADD COLUMN IF NOT EXISTS "seoTitle" TEXT;
ALTER TABLE "service_settings" ADD COLUMN IF NOT EXISTS "seoDescription" TEXT;
ALTER TABLE "service_settings" ADD COLUMN IF NOT EXISTS "seoImage" TEXT;
ALTER TABLE "service_settings" ADD COLUMN IF NOT EXISTS "seoSiteName" TEXT;
ALTER TABLE "service_settings" ADD COLUMN IF NOT EXISTS "twitterCardType" TEXT NOT NULL DEFAULT 'summary_large_image';
