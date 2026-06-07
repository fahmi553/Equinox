CREATE TABLE "AdapterFileMetadata" (
    "id" TEXT NOT NULL,
    "adapterKey" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "size" INTEGER,
    "isImportant" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "AdapterFileMetadata_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "_AdapterFileMetadataToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

CREATE UNIQUE INDEX "AdapterFileMetadata_adapterKey_path_ownerId_key" ON "AdapterFileMetadata"("adapterKey", "path", "ownerId");
CREATE INDEX "AdapterFileMetadata_adapterKey_path_idx" ON "AdapterFileMetadata"("adapterKey", "path");
CREATE INDEX "AdapterFileMetadata_ownerId_isImportant_updatedAt_idx" ON "AdapterFileMetadata"("ownerId", "isImportant", "updatedAt");
CREATE UNIQUE INDEX "_AdapterFileMetadataToTag_AB_unique" ON "_AdapterFileMetadataToTag"("A", "B");
CREATE INDEX "_AdapterFileMetadataToTag_B_index" ON "_AdapterFileMetadataToTag"("B");

ALTER TABLE "AdapterFileMetadata" ADD CONSTRAINT "AdapterFileMetadata_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_AdapterFileMetadataToTag" ADD CONSTRAINT "_AdapterFileMetadataToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "AdapterFileMetadata"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_AdapterFileMetadataToTag" ADD CONSTRAINT "_AdapterFileMetadataToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
