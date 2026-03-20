-- CreateTable
CREATE TABLE "rate_limit_records" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "resetTime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limit_records_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "rate_limit_records_resetTime_idx" ON "rate_limit_records"("resetTime");
