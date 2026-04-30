-- CreateEnum
CREATE TYPE "IdempotencyStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INTERNAL_TRANSFER', 'INTERNATIONAL_TRANSFER', 'PAYROLL_DISBURSEMENT', 'FEE_COLLECTION');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'DEBIT_COMPLETE', 'COMPLETED', 'FAILED', 'REVERSED');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');

-- CreateEnum
CREATE TYPE "EntryType" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('ACTIVE', 'USED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('PENDING', 'PROCESSING', 'PARTIALLY_COMPLETE', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "DisbursementStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "balance" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "ledgerAccountCode" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "status" "IdempotencyStatus" NOT NULL DEFAULT 'PROCESSING',
    "responseBody" JSONB,
    "responseCode" INTEGER,
    "transactionId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "senderWalletId" TEXT,
    "senderUserId" TEXT,
    "recipientWalletId" TEXT,
    "recipientUserId" TEXT,
    "amount" DECIMAL(20,8) NOT NULL,
    "currency" TEXT NOT NULL,
    "fxQuoteId" TEXT,
    "fxRate" DECIMAL(20,8),
    "fromCurrency" TEXT,
    "toCurrency" TEXT,
    "toAmount" DECIMAL(20,8),
    "payrollJobId" TEXT,
    "failureReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerAccount" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "currency" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "entryType" "EntryType" NOT NULL,
    "amount" DECIMAL(20,8) NOT NULL,
    "currency" TEXT NOT NULL,
    "fxRate" DECIMAL(20,8),
    "description" TEXT,
    "sequence" BIGSERIAL NOT NULL,
    "previousHash" TEXT,
    "hash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FXQuote" (
    "id" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "fromCurrency" TEXT NOT NULL,
    "toCurrency" TEXT NOT NULL,
    "fromAmount" DECIMAL(20,8) NOT NULL,
    "toAmount" DECIMAL(20,8) NOT NULL,
    "rate" DECIMAL(20,8) NOT NULL,
    "provider" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FXQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FXRateCache" (
    "id" TEXT NOT NULL,
    "pair" TEXT NOT NULL,
    "rate" DECIMAL(20,8) NOT NULL,
    "provider" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FXRateCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollJob" (
    "id" TEXT NOT NULL,
    "employerId" TEXT NOT NULL,
    "employerWalletId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" "PayrollStatus" NOT NULL DEFAULT 'PENDING',
    "totalAmount" DECIMAL(20,8) NOT NULL,
    "currency" TEXT NOT NULL,
    "totalCount" INTEGER NOT NULL,
    "processedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "checkpointIndex" INTEGER NOT NULL DEFAULT -1,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "PayrollJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollDisbursement" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "recipientWalletId" TEXT NOT NULL,
    "amount" DECIMAL(20,8) NOT NULL,
    "currency" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "status" "DisbursementStatus" NOT NULL DEFAULT 'PENDING',
    "transactionId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "failureReason" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollDisbursement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_ledgerAccountCode_key" ON "Wallet"("ledgerAccountCode");

-- CreateIndex
CREATE INDEX "Wallet_userId_idx" ON "Wallet"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_currency_key" ON "Wallet"("userId", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyKey_key_key" ON "IdempotencyKey"("key");

-- CreateIndex
CREATE INDEX "IdempotencyKey_key_idx" ON "IdempotencyKey"("key");

-- CreateIndex
CREATE INDEX "IdempotencyKey_expiresAt_idx" ON "IdempotencyKey"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_fxQuoteId_key" ON "Transaction"("fxQuoteId");

-- CreateIndex
CREATE INDEX "Transaction_senderUserId_idx" ON "Transaction"("senderUserId");

-- CreateIndex
CREATE INDEX "Transaction_recipientUserId_idx" ON "Transaction"("recipientUserId");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");

-- CreateIndex
CREATE INDEX "Transaction_payrollJobId_idx" ON "Transaction"("payrollJobId");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerAccount_code_key" ON "LedgerAccount"("code");

-- CreateIndex
CREATE INDEX "LedgerAccount_code_idx" ON "LedgerAccount"("code");

-- CreateIndex
CREATE INDEX "LedgerAccount_currency_idx" ON "LedgerAccount"("currency");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerEntry_hash_key" ON "LedgerEntry"("hash");

-- CreateIndex
CREATE INDEX "LedgerEntry_transactionId_idx" ON "LedgerEntry"("transactionId");

-- CreateIndex
CREATE INDEX "LedgerEntry_accountId_idx" ON "LedgerEntry"("accountId");

-- CreateIndex
CREATE INDEX "LedgerEntry_sequence_idx" ON "LedgerEntry"("sequence");

-- CreateIndex
CREATE INDEX "LedgerEntry_currency_idx" ON "LedgerEntry"("currency");

-- CreateIndex
CREATE INDEX "FXQuote_requestedBy_idx" ON "FXQuote"("requestedBy");

-- CreateIndex
CREATE INDEX "FXQuote_status_expiresAt_idx" ON "FXQuote"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "FXRateCache_pair_key" ON "FXRateCache"("pair");

-- CreateIndex
CREATE INDEX "FXRateCache_pair_idx" ON "FXRateCache"("pair");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollJob_idempotencyKey_key" ON "PayrollJob"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PayrollJob_employerId_status_idx" ON "PayrollJob"("employerId", "status");

-- CreateIndex
CREATE INDEX "PayrollJob_status_idx" ON "PayrollJob"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollDisbursement_transactionId_key" ON "PayrollDisbursement"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollDisbursement_idempotencyKey_key" ON "PayrollDisbursement"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PayrollDisbursement_jobId_idx" ON "PayrollDisbursement"("jobId");

-- CreateIndex
CREATE INDEX "PayrollDisbursement_jobId_index_idx" ON "PayrollDisbursement"("jobId", "index");

-- CreateIndex
CREATE INDEX "PayrollDisbursement_status_idx" ON "PayrollDisbursement"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollDisbursement_jobId_index_key" ON "PayrollDisbursement"("jobId", "index");

-- AddForeignKey
ALTER TABLE "IdempotencyKey" ADD CONSTRAINT "IdempotencyKey_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_fxQuoteId_fkey" FOREIGN KEY ("fxQuoteId") REFERENCES "FXQuote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_payrollJobId_fkey" FOREIGN KEY ("payrollJobId") REFERENCES "PayrollJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_recipientWalletId_fkey" FOREIGN KEY ("recipientWalletId") REFERENCES "Wallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_senderWalletId_fkey" FOREIGN KEY ("senderWalletId") REFERENCES "Wallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "LedgerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollDisbursement" ADD CONSTRAINT "PayrollDisbursement_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "PayrollJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollDisbursement" ADD CONSTRAINT "PayrollDisbursement_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
