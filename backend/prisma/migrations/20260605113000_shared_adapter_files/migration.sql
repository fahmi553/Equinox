ALTER TABLE "AdapterFileMetadata" ADD COLUMN "isShared" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "AdapterFileMetadata_isShared_updatedAt_idx" ON "AdapterFileMetadata"("isShared", "updatedAt");
