-- CreateTable
CREATE TABLE "email_settings" (
    "id" TEXT NOT NULL,
    "emailVerificationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "providerApiKey" TEXT,
    "providerBaseUrl" TEXT,
    "fromEmail" TEXT,
    "fromName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_settings_pkey" PRIMARY KEY ("id")
);
