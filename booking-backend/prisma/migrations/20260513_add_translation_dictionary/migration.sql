-- Migration: Add TranslationDictionary model
-- Table: translation_dictionaries

-- CreateTable with all constraints inline (matching Prisma @@unique behavior)
CREATE TABLE "translation_dictionaries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "domain" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "value" TEXT NOT NULL,
    "is_custom" BOOLEAN NOT NULL DEFAULT false,
    "tenant_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "translation_dictionaries_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "translation_dictionaries_domain_key_locale_tenant_id_key" UNIQUE ("domain", "key", "locale", "tenant_id")
);

-- CreateIndex: @@index([domain, key])
CREATE INDEX "translation_dictionaries_domain_key_idx" ON "translation_dictionaries"("domain", "key");

-- CreateIndex: @@index([locale])
CREATE INDEX "translation_dictionaries_locale_idx" ON "translation_dictionaries"("locale");
