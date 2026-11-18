-- backend/migrations/0015_add_lockup_expires_at.sql
-- Adds the lockup_expires_at column to the investments table.
-- Fixes: [validateLockup] Could not read investments row: column investments.lockup_expires_at does not exist
-- Run this in the Supabase SQL editor.

ALTER TABLE public.investments
  ADD COLUMN IF NOT EXISTS lockup_expires_at timestamptz;

-- Optional: index for quick lookup of expired lockups
CREATE INDEX IF NOT EXISTS idx_investments_lockup_expires_at
  ON public.investments(lockup_expires_at)
  WHERE lockup_expires_at IS NOT NULL;

