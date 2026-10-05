CREATE TABLE "Board" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Untitled board',
    "document" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Board_pkey" PRIMARY KEY ("id")
);
