CREATE TABLE "AdapterFileShare" (
    "id" TEXT NOT NULL,
    "metadataId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdapterFileShare_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PublicFileShareLink" (
    "id" TEXT NOT NULL,
    "metadataId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicFileShareLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdapterFileShare_metadataId_userId_key" ON "AdapterFileShare"("metadataId", "userId");
CREATE INDEX "AdapterFileShare_userId_createdAt_idx" ON "AdapterFileShare"("userId", "createdAt");

CREATE UNIQUE INDEX "PublicFileShareLink_tokenHash_key" ON "PublicFileShareLink"("tokenHash");
CREATE INDEX "PublicFileShareLink_metadataId_isRevoked_idx" ON "PublicFileShareLink"("metadataId", "isRevoked");
CREATE INDEX "PublicFileShareLink_expiresAt_idx" ON "PublicFileShareLink"("expiresAt");

CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX "PasswordResetToken_userId_usedAt_expiresAt_idx" ON "PasswordResetToken"("userId", "usedAt", "expiresAt");

ALTER TABLE "AdapterFileShare" ADD CONSTRAINT "AdapterFileShare_metadataId_fkey" FOREIGN KEY ("metadataId") REFERENCES "AdapterFileMetadata"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdapterFileShare" ADD CONSTRAINT "AdapterFileShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PublicFileShareLink" ADD CONSTRAINT "PublicFileShareLink_metadataId_fkey" FOREIGN KEY ("metadataId") REFERENCES "AdapterFileMetadata"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
