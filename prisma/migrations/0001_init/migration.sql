-- CreateTable
CREATE TABLE "Installation" (
  "id" TEXT NOT NULL,
  "account" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Installation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Repository" (
  "id" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "defaultBranch" TEXT NOT NULL,
  "installationId" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "lastScannedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Repository_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Scan" (
  "id" TEXT NOT NULL,
  "repositoryId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "summary" TEXT,
  "pullRequest" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Scan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Repository_fullName_key" ON "Repository"("fullName");
ALTER TABLE "Repository" ADD CONSTRAINT "Repository_installationId_fkey" FOREIGN KEY ("installationId") REFERENCES "Installation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;
