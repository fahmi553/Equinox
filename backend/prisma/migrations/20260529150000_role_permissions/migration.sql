CREATE TABLE "RolePermission" (
  "role" "Role" NOT NULL,
  "canUploadFiles" BOOLEAN NOT NULL DEFAULT true,
  "canCreateFolders" BOOLEAN NOT NULL DEFAULT true,
  "canCreateNotes" BOOLEAN NOT NULL DEFAULT true,
  "canCreateReminders" BOOLEAN NOT NULL DEFAULT true,
  "canCreateDocumentRecords" BOOLEAN NOT NULL DEFAULT true,
  "canViewAnnouncements" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("role")
);

INSERT INTO "RolePermission" (
  "role",
  "canUploadFiles",
  "canCreateFolders",
  "canCreateNotes",
  "canCreateReminders",
  "canCreateDocumentRecords",
  "canViewAnnouncements"
) VALUES
  ('ADMIN', true, true, true, true, true, true),
  ('FAMILY', true, true, true, true, true, true);

ALTER TABLE "User" ALTER COLUMN "canUploadFiles" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "canUploadFiles" DROP NOT NULL;
ALTER TABLE "User" ALTER COLUMN "canCreateFolders" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "canCreateFolders" DROP NOT NULL;
ALTER TABLE "User" ALTER COLUMN "canCreateNotes" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "canCreateNotes" DROP NOT NULL;
ALTER TABLE "User" ALTER COLUMN "canCreateReminders" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "canCreateReminders" DROP NOT NULL;
ALTER TABLE "User" ALTER COLUMN "canCreateDocumentRecords" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "canCreateDocumentRecords" DROP NOT NULL;
ALTER TABLE "User" ALTER COLUMN "canViewAnnouncements" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "canViewAnnouncements" DROP NOT NULL;

UPDATE "User" SET "canUploadFiles" = NULL WHERE "canUploadFiles" = true;
UPDATE "User" SET "canCreateFolders" = NULL WHERE "canCreateFolders" = true;
UPDATE "User" SET "canCreateNotes" = NULL WHERE "canCreateNotes" = true;
UPDATE "User" SET "canCreateReminders" = NULL WHERE "canCreateReminders" = true;
UPDATE "User" SET "canCreateDocumentRecords" = NULL WHERE "canCreateDocumentRecords" = true;
UPDATE "User" SET "canViewAnnouncements" = NULL WHERE "canViewAnnouncements" = true;
