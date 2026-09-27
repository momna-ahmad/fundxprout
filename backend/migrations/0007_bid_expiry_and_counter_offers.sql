-- backend/migrations/0007_bid_expiry_and_counter_offers.sql
-- shafqaat implemented
-- Fix 6: Automated bid expiry sweep function + pg_cron schedule.
-- Fix 7: Counter-offer columns and extended status CHECK on token_bids.
--
-- Run this entire file in your Supabase SQL Editor.
-- Prerequisites: pg_cron extension must be enabled in Supabase project settings
--   (Database → Extensions → pg_cron).

-- ─────────────────────────────────────────────────────────────────────────────
-- PART A — Fix 7: Extend token_bids table with counter-offer columns
-- ─────────────────────────────────────────────────────────────────────────────

-- Add counter-offer fields (safe to run multiple times — IF NOT EXISTS guards)
ALTER TABLE public.token_bids
  ADD COLUMN IF NOT EXISTS original_bid_price      numeric,               -- Buyer's original bid (audit trail)
  ADD COLUMN IF NOT EXISTS counter_price_per_token numeric,               -- Seller's counter price
  ADD COLUMN IF NOT EXISTS counter_expires_at      timestamp with time zone, -- Counter-offer deadline
  ADD COLUMN IF NOT EXISTS counter_message         text;                  -- Optional seller note

-- Extend the status CHECK constraint to include new counter-offer states.
-- We must drop and recreate the constraint because ALTER CONSTRAINT cannot change the check expression.
ALTER TABLE public.token_bids
  DROP CONSTRAINT IF EXISTS token_bids_status_check;

ALTER TABLE public.token_bids
  ADD CONSTRAINT token_bids_status_check
  CHECK (status = ANY (ARRAY[
    'pending',          -- buyer placed bid, waiting for seller to review
    'counter_offered',  -- seller sent a counter-price; buyer must respond
    'counter_accepted', -- buyer accepted counter → can proceed to confirm+complete
    'counter_rejected', -- buyer rejected counter → bid ends, listing re-opens
    'accepted',         -- seller accepted original bid
    'confirmed',        -- buyer clicked "Confirm Purchase" → on-chain tx pending
    'completed',        -- fillOrder() succeeded — trade done on-chain
    'rejected',         -- seller hard-rejected the bid
    'cancelled',        -- buyer withdrew their own bid
    'expired'           -- bid_expires_at or counter_expires_at passed
  ]));

-- Index for fast counter-offer lookups
CREATE INDEX IF NOT EXISTS idx_token_bids_counter_offered
  ON public.token_bids(listing_id)
  WHERE status = 'counter_offered';

-- ─────────────────────────────────────────────────────────────────────────────
-- PART B — Fix 6: Automated bid expiry sweep
-- ─────────────────────────────────────────────────────────────────────────────

-- Sweep function: expires pending bids past bid_expires_at,
-- accepted bids past accept_deadline, and counter-offers past counter_expires_at.
-- Called every 5 minutes by pg_cron and also by the Node.js fallback interval.
CREATE OR REPLACE FUNCTION public.fn_sweep_expired_bids()
RETURNS void AS $$
BEGIN
  -- 1. Expire pending bids whose bid window has closed
  UPDATE public.token_bids
  SET status = 'expired', updated_at = now()
  WHERE status = 'pending'
    AND bid_expires_at < now();

  -- 2. Expire accepted bids where buyer missed the 24-hour confirm window
  UPDATE public.token_bids
  SET status = 'expired', updated_at = now()
  WHERE status = 'accepted'
    AND accept_deadline IS NOT NULL
    AND accept_deadline < now();

  -- 3. Expire counter-offers the buyer did not respond to within the counter window
  UPDATE public.token_bids
  SET status = 'expired', updated_at = now()
  WHERE status = 'counter_offered'
    AND counter_expires_at IS NOT NULL
    AND counter_expires_at < now();

  -- 4. Expire counter_accepted bids where buyer missed the 24-hour confirm window
  UPDATE public.token_bids
  SET status = 'expired', updated_at = now()
  WHERE status = 'counter_accepted'
    AND accept_deadline IS NOT NULL
    AND accept_deadline < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users so the Node.js backend can call it via supabaseAdmin.rpc()
GRANT EXECUTE ON FUNCTION public.fn_sweep_expired_bids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_sweep_expired_bids() TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- PART C — Schedule via pg_cron (enable pg_cron extension first)
-- ─────────────────────────────────────────────────────────────────────────────

-- Unschedule any existing job with the same name to avoid duplicates on re-run
SELECT cron.unschedule('sweep-expired-bids') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'sweep-expired-bids'
);

-- Schedule the sweep to run every 5 minutes
SELECT cron.schedule(
  'sweep-expired-bids',
  '*/5 * * * *',
  $$ SELECT public.fn_sweep_expired_bids(); $$
);
