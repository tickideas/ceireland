-- CreateTable
CREATE TABLE "stream_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "streamUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
