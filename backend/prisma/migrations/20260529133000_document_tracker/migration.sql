CREATE TABLE "DocumentRecord" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'GENERAL',
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "amount" DOUBLE PRECISION,
  "notes" TEXT NOT NULL DEFAULT '',
  "dueAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "ownerId" TEXT NOT NULL,
  "fileId" TEXT,

  CONSTRAINT "DocumentRecord_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "DocumentRecord" ADD CONSTRAINT "DocumentRecord_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentRecord" ADD CONSTRAINT "DocumentRecord_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
