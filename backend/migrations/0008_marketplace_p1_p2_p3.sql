-- backend/migrations/0008_marketplace_p1_p2_p3.sql
-- Run this in the Supabase SQL Editor

-- shafqaat implemented — Fix P2: Create token_trades if it doesn't exist, or ensure it supports auction bids
-- 1. Create public.token_trades table if it does not already exist
CREATE TABLE IF NOT EXISTS public.token_trades (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id bigint NOT NULL REFERENCES public.campaigns(id),
    buy_order_id uuid REFERENCES public.token_orders(id), -- Nullable for auction bids
    sell_order_id uuid REFERENCES public.token_orders(id),
    bid_id uuid REFERENCES public.token_bids(id),
    buyer_id uuid NOT NULL REFERENCES public.profiles(user_id),
    seller_id uuid NOT NULL REFERENCES public.profiles(user_id),
    price numeric NOT NULL,
    quantity numeric NOT NULL,
    fee_amount numeric NOT NULL DEFAULT 0,
    tx_hash text,
    settlement_status text NOT NULL DEFAULT 'pending' CHECK (settlement_status IN ('pending','settled','failed')),
    executed_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 2. If token_trades already existed from prior setup, ensure buy_order_id is nullable and bid_id exists
DO $$
BEGIN
  -- Make buy_order_id nullable
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'token_trades' AND column_name = 'buy_order_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.token_trades ALTER COLUMN buy_order_id DROP NOT NULL;
  END IF;

  -- Add bid_id column if not present
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'token_trades' AND column_name = 'bid_id'
  ) THEN
    ALTER TABLE public.token_trades ADD COLUMN bid_id uuid REFERENCES public.token_bids(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_token_trades_bid_id ON public.token_trades(bid_id);
CREATE INDEX IF NOT EXISTS idx_token_trades_campaign_id ON public.token_trades(campaign_id);

-- shafqaat implemented — Fix P3: Add auto-accept threshold price to sell listings
ALTER TABLE public.token_orders
  ADD COLUMN IF NOT EXISTS auto_accept_price_per_token numeric;

-- shafqaat implemented — Fix P1: Atomic stored procedure to complete a bid and decrement listing remaining quantity
-- This guarantees no race condition or double-fill if multiple bids complete concurrently.
CREATE OR REPLACE FUNCTION public.fn_complete_bid_atomic(
  p_bid_id uuid,
  p_tx_hash text,
  p_block_number bigint DEFAULT NULL,
  p_fee_amount numeric DEFAULT 0
)
RETURNS jsonb AS $$
DECLARE
  v_bid record;
  v_listing record;
  v_trade_id uuid;
  v_effective_price numeric;
BEGIN
  -- 1. Fetch and lock the bid
  SELECT * INTO v_bid
  FROM public.token_bids
  WHERE id = p_bid_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bid not found');
  END IF;

  IF v_bid.status NOT IN ('accepted', 'confirmed', 'counter_accepted') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bid status is not ready for completion: ' || v_bid.status);
  END IF;

  -- 2. Fetch and lock the listing
  SELECT * INTO v_listing
  FROM public.token_orders
  WHERE id = v_bid.listing_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Listing not found');
  END IF;

  IF v_listing.quantity_remaining < v_bid.quantity THEN
    RETURN jsonb_build_object('success', false, 'error', 'Listing does not have enough remaining quantity (' || v_listing.quantity_remaining || ' available, ' || v_bid.quantity || ' requested)');
  END IF;

  -- 3. Determine effective price (negotiated counter price if counter_accepted, else original bid price)
  IF v_bid.status = 'counter_accepted' AND v_bid.counter_price_per_token IS NOT NULL THEN
    v_effective_price := v_bid.counter_price_per_token;
  ELSE
    v_effective_price := v_bid.bid_price_per_token;
  END IF;

  -- 4. Mark bid as completed
  UPDATE public.token_bids
  SET status = 'completed',
      tx_hash = p_tx_hash,
      block_number = p_block_number,
      updated_at = now()
  WHERE id = p_bid_id;

  -- 5. Atomically decrement quantity_remaining on listing
  UPDATE public.token_orders
  SET quantity_remaining = quantity_remaining - v_bid.quantity,
      quantity_filled = COALESCE(quantity_filled, 0) + v_bid.quantity,
      status = CASE WHEN (quantity_remaining - v_bid.quantity) <= 0 THEN 'filled' ELSE 'open' END,
      updated_at = now()
  WHERE id = v_bid.listing_id;

  -- 6. Insert trade record into token_trades
  INSERT INTO public.token_trades (
    campaign_id,
    buy_order_id,
    sell_order_id,
    bid_id,
    buyer_id,
    seller_id,
    price,
    quantity,
    fee_amount,
    tx_hash,
    settlement_status,
    executed_at
  ) VALUES (
    v_bid.campaign_id,
    NULL,
    v_bid.listing_id,
    p_bid_id,
    v_bid.buyer_id,
    v_listing.investor_id,
    v_effective_price,
    v_bid.quantity,
    p_fee_amount,
    p_tx_hash,
    'settled',
    now()
  ) RETURNING id INTO v_trade_id;

  RETURN jsonb_build_object(
    'success', true,
    'trade_id', v_trade_id,
    'bid_id', p_bid_id,
    'effective_price', v_effective_price,
    'quantity', v_bid.quantity
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
