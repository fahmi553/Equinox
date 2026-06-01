CREATE TABLE "ModuleSetting" (
  "key" TEXT NOT NULL,
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  "healthState" TEXT NOT NULL DEFAULT 'available',
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ModuleSetting_pkey" PRIMARY KEY ("key")
);
