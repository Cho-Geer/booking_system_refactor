-- Add email verification code table
CREATE TABLE "email_verification_codes" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'REGISTER',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_codes_pkey" PRIMARY KEY ("id")
);

-- Create index for efficient code lookup
CREATE INDEX "email_verification_codes_email_type_idx" ON "email_verification_codes" ("email", "type");

-- Create index for cleanup of expired codes
CREATE INDEX "email_verification_codes_expires_at_idx" ON "email_verification_codes" ("expires_at");
