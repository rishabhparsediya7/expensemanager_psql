-- Split Expenses Database Schema Migration
-- Run this script against your PostgreSQL database

-- Split Expenses Table (main expense that gets split)
CREATE TABLE IF NOT EXISTS "splitExpenses" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdBy" UUID NOT NULL REFERENCES users(id),
  "description" TEXT NOT NULL,
  "totalAmount" DECIMAL(12, 2) NOT NULL,
  "category" INTEGER REFERENCES category(id),
  "splitType" VARCHAR(20) DEFAULT 'equal', -- 'equal', 'percentage', 'exact'
  "expenseDate" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "status" VARCHAR(20) DEFAULT 'pending', -- 'pending', 'partially_settled', 'settled'
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Participants in a split expense
CREATE TABLE IF NOT EXISTS "splitExpenseParticipants" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "splitExpenseId" UUID NOT NULL REFERENCES "splitExpenses"(id) ON DELETE CASCADE,
  "userId" UUID NOT NULL REFERENCES users(id),
  "amountOwed" DECIMAL(12, 2) NOT NULL,          -- Amount this user owes
  "amountPaid" DECIMAL(12, 2) DEFAULT 0,         -- Amount this user has paid back
  "isPayer" BOOLEAN DEFAULT FALSE,               -- TRUE if this user paid the original expense
  "status" VARCHAR(20) DEFAULT 'pending',        -- 'pending', 'settled'
  "settledAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Settlement records (when someone pays back)
CREATE TABLE IF NOT EXISTS "settlements" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "splitExpenseId" UUID NOT NULL REFERENCES "splitExpenses"(id),
  "payerId" UUID NOT NULL REFERENCES users(id),  -- Who is paying
  "payeeId" UUID NOT NULL REFERENCES users(id),  -- Who is receiving
  "amount" DECIMAL(12, 2) NOT NULL,
  "note" TEXT,
  "settledAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Overall balance between two users (aggregated view)
CREATE TABLE IF NOT EXISTS "userBalances" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES users(id),
  "friendId" UUID NOT NULL REFERENCES users(id),
  "balance" DECIMAL(12, 2) DEFAULT 0,  -- Positive = friend owes user, Negative = user owes friend
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("userId", "friendId")
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_split_expenses_created_by ON "splitExpenses"("createdBy");
CREATE INDEX IF NOT EXISTS idx_split_participants_user ON "splitExpenseParticipants"("userId");
CREATE INDEX IF NOT EXISTS idx_split_participants_expense ON "splitExpenseParticipants"("splitExpenseId");
CREATE INDEX IF NOT EXISTS idx_settlements_payer ON "settlements"("payerId");
CREATE INDEX IF NOT EXISTS idx_user_balances_user ON "userBalances"("userId");

-- Helpful comment
COMMENT ON TABLE "splitExpenses" IS 'Main table for split expenses created by users';
COMMENT ON TABLE "splitExpenseParticipants" IS 'Participants in each split expense and their owed amounts';
COMMENT ON TABLE "settlements" IS 'Records of payments made between users for split expenses';
COMMENT ON TABLE "userBalances" IS 'Pre-computed running balances between pairs of users';
