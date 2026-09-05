-- backend/migrations/0004_token_bids.sql
-- Adds the auction-style bidding system tables and columns.
-- Run this in your Supabase SQL editor.
-- Does NOT modify any existing tables or functions.

-- ── 1. Add seller signature columns to token_orders ──────────────
-- Stores the EIP-712 seller signature so buyers can call fillOrder()
-- later without the seller needing to be online at trade time.

ALTER TABLE public.token_orders
  ADD COLUMN IF NOT EXISTS seller_signature text,
  ADD COLUMN IF NOT EXISTS seller_nonce bigint;

-- ── 2. Create token_bids table ───────────────────────────────────
-- Each row = one buyer's bid on one sell listing (token_orders row).
-- The listing_id FK links each bid back to the specific sell order.

CREATE TABLE IF NOT EXISTS public.token_bids (
  id uuid NOT NULL DEFAULT gen_random_uuid(),

  -- Which sell listing this bid is for
  listing_id uuid NOT NULL,   -- FK → token_orders.id (must be side='sell')

  -- Which campaign (denormalised for fast queries without joining token_orders)
  campaign_id bigint NOT NULL,

  -- The buyer
  buyer_id uuid NOT NULL,        -- FK → profiles.user_id
  buyer_wallet text NOT NULL,    -- MetaMask wallet address (lowercase)

  -- Bid terms
  bid_price_per_token numeric NOT NULL,   -- ETH per token the buyer is offering
  quantity numeric NOT NULL,              -- How many tokens they want

  -- Lifecycle status
  status text NOT NULL DEFAULT 'pending'
    CHECK (status = ANY (ARRAY[
      'pending',    -- bid placed, waiting for seller to review
      'accepted',   -- seller chose this bid — buyer must now confirm purchase
      'confirmed',  -- buyer clicked "Confirm Purchase" → on-chain tx pending
      'completed',  -- fillOrder() succeeded — trade done
      'rejected',   -- seller rejected this bid explicitly
      'cancelled',  -- buyer withdrew their own bid
      'expired'     -- bid_expires_at passed without seller responding
    ])),

  -- Time constraints
  bid_expires_at timestamp with time zone NOT NULL,
  accept_deadline timestamp with time zone,   -- SET when seller accepts; buyer must confirm within 24hrs

  -- On-chain settlement (filled in when buyer calls fillOrder())
  tx_hash text,
  block_number bigint,

  -- Timestamps
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),

  CONSTRAINT token_bids_pkey PRIMARY KEY (id),
  CONSTRAINT token_bids_listing_id_fkey
    FOREIGN KEY (listing_id) REFERENCES public.token_orders(id),
  CONSTRAINT token_bids_campaign_id_fkey
    FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id),
  CONSTRAINT token_bids_buyer_id_fkey
    FOREIGN KEY (buyer_id) REFERENCES public.profiles(user_id)
);

-- ── 3. Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_token_bids_listing_id ON public.token_bids(listing_id);
CREATE INDEX IF NOT EXISTS idx_token_bids_buyer_id    ON public.token_bids(buyer_id);
CREATE INDEX IF NOT EXISTS idx_token_bids_status      ON public.token_bids(status);
