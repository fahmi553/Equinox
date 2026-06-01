CREATE TABLE "SystemSetting" (
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "IntegrationSetting" (
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "adapterType" TEXT NOT NULL,
  "isEnabled" BOOLEAN NOT NULL DEFAULT false,
  "healthState" TEXT NOT NULL DEFAULT 'planned',
  "config" JSONB,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "IntegrationSetting_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "UserPreference" (
  "userId" TEXT NOT NULL,
  "startPage" TEXT NOT NULL DEFAULT '/dashboard',
  "compactMode" BOOLEAN NOT NULL DEFAULT false,
  "dateFormat" TEXT NOT NULL DEFAULT 'locale',
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "UserPreference"
ADD CONSTRAINT "UserPreference_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
