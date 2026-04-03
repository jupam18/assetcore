-- CreateTable
CREATE TABLE "AssetView" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "columns" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetView_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AssetView" ADD CONSTRAINT "AssetView_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
