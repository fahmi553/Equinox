ALTER TABLE "User" ADD COLUMN "canUseChat" BOOLEAN;

ALTER TABLE "RolePermission" ADD COLUMN "canUseChat" BOOLEAN NOT NULL DEFAULT true;

UPDATE "RolePermission" SET "canUseChat" = false WHERE "role" = 'GUEST';

ALTER TABLE "Notification" ADD COLUMN "sourceId" TEXT;

CREATE INDEX "Notification_type_sourceId_idx" ON "Notification"("type", "sourceId");
