-- Migration: 0002_marketplace_functions.sql
-- Adds DB-side transactional helper functions for marketplace operations.

-- Reserve tokens for a sell order atomically: move available_balance -> locked_balance
CREATE OR REPLACE FUNCTION reserve_tokens_for_sell(
  p_investor uuid,
  p_campaign_id bigint,
  p_qty numeric
)
RETURNS TABLE(id uuid, investor_id uuid, campaign_id bigint, available_balance numeric, locked_balance numeric, updated_at timestamptz) AS $$
DECLARE
  rec token_holdings%ROWTYPE;
BEGIN
  SELECT * INTO rec FROM token_holdings WHERE investor_id = p_investor AND campaign_id = p_campaign_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'no_holdings';
  END IF;
  IF rec.available_balance < p_qty THEN
    RAISE EXCEPTION 'insufficient_balance';
  END IF;
  UPDATE token_holdings
    SET available_balance = available_balance - p_qty,
        locked_balance = locked_balance + p_qty,
        updated_at = now()
    WHERE id = rec.id;
  RETURN QUERY SELECT id, investor_id, campaign_id, available_balance, locked_balance, updated_at FROM token_holdings WHERE id = rec.id;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Release a reservation atomically: move locked_balance -> available_balance
CREATE OR REPLACE FUNCTION release_token_reservation(
  p_investor uuid,
  p_campaign_id bigint,
  p_qty numeric
)
RETURNS TABLE(id uuid, investor_id uuid, campaign_id bigint, available_balance numeric, locked_balance numeric, updated_at timestamptz) AS $$
DECLARE
  rec token_holdings%ROWTYPE;
BEGIN
  SELECT * INTO rec FROM token_holdings WHERE investor_id = p_investor AND campaign_id = p_campaign_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'no_holdings';
  END IF;
  IF rec.locked_balance < p_qty THEN
    RAISE EXCEPTION 'insufficient_locked_balance';
  END IF;
  UPDATE token_holdings
    SET locked_balance = GREATEST(0, locked_balance - p_qty),
        available_balance = available_balance + p_qty,
        updated_at = now()
    WHERE id = rec.id;
  RETURN QUERY SELECT id, investor_id, campaign_id, available_balance, locked_balance, updated_at FROM token_holdings WHERE id = rec.id;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Commit a transfer atomically: move qty from seller.locked_balance -> buyer.available_balance
-- Returns a JSON object with seller and buyer holding rows
CREATE OR REPLACE FUNCTION commit_token_transfer(
  p_seller uuid,
  p_buyer uuid,
  p_campaign_id bigint,
  p_qty numeric
)
RETURNS json AS $$
DECLARE
  seller_rec token_holdings%ROWTYPE;
  buyer_rec token_holdings%ROWTYPE;
  result json;
BEGIN
  -- lock seller row
  SELECT * INTO seller_rec FROM token_holdings WHERE investor_id = p_seller AND campaign_id = p_campaign_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'seller_no_holdings';
  END IF;
  IF seller_rec.locked_balance < p_qty THEN
    RAISE EXCEPTION 'seller_insufficient_locked_balance';
  END IF;

  UPDATE token_holdings SET locked_balance = locked_balance - p_qty, updated_at = now() WHERE id = seller_rec.id;
  SELECT * INTO seller_rec FROM token_holdings WHERE id = seller_rec.id;

  -- handle buyer (upsert-like)
  SELECT * INTO buyer_rec FROM token_holdings WHERE investor_id = p_buyer AND campaign_id = p_campaign_id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO token_holdings(investor_id, campaign_id, available_balance, locked_balance, updated_at)
    VALUES (p_buyer, p_campaign_id, p_qty, 0, now())
    RETURNING * INTO buyer_rec;
  ELSE
    UPDATE token_holdings SET available_balance = available_balance + p_qty, updated_at = now() WHERE id = buyer_rec.id;
    SELECT * INTO buyer_rec FROM token_holdings WHERE id = buyer_rec.id;
  END IF;

  result := json_build_object('seller', row_to_json(seller_rec), 'buyer', row_to_json(buyer_rec));
  RETURN result;
END;
$$ LANGUAGE plpgsql VOLATILE;
