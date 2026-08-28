-- Use the existing `tokens` table as the marketplace balance ledger.
-- `amount` is the total token balance; `locked_amount` is reserved by open sell orders.
ALTER TABLE tokens
  ADD COLUMN IF NOT EXISTS locked_amount numeric NOT NULL DEFAULT 0;

ALTER TABLE tokens
  ADD CONSTRAINT tokens_locked_amount_valid
  CHECK (locked_amount >= 0 AND locked_amount <= amount);

CREATE INDEX IF NOT EXISTS idx_tokens_user_campaign
  ON tokens(user_id, campaign_id);

CREATE OR REPLACE FUNCTION reserve_tokens_for_sell(
  p_investor uuid,
  p_campaign_id bigint,
  p_qty numeric
)
RETURNS TABLE(available_balance numeric, locked_balance numeric) AS $$
DECLARE
  rec tokens%ROWTYPE;
  remaining numeric := p_qty;
  available numeric;
  portion numeric;
BEGIN
  SELECT COALESCE(SUM(amount - locked_amount), 0) INTO available
  FROM tokens
  WHERE user_id = p_investor AND campaign_id = p_campaign_id;

  IF available < p_qty THEN
    RAISE EXCEPTION 'insufficient_balance';
  END IF;

  FOR rec IN
    SELECT * FROM tokens
    WHERE user_id = p_investor AND campaign_id = p_campaign_id AND amount > locked_amount
    ORDER BY created_at, id
    FOR UPDATE
  LOOP
    EXIT WHEN remaining <= 0;
    portion := LEAST(rec.amount - rec.locked_amount, remaining);
    UPDATE tokens SET locked_amount = locked_amount + portion WHERE id = rec.id;
    remaining := remaining - portion;
  END LOOP;

  RETURN QUERY
  SELECT COALESCE(SUM(amount - locked_amount), 0), COALESCE(SUM(locked_amount), 0)
  FROM tokens WHERE user_id = p_investor AND campaign_id = p_campaign_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION release_token_reservation(
  p_investor uuid,
  p_campaign_id bigint,
  p_qty numeric
)
RETURNS TABLE(available_balance numeric, locked_balance numeric) AS $$
DECLARE
  rec tokens%ROWTYPE;
  remaining numeric := p_qty;
  portion numeric;
BEGIN
  IF COALESCE((SELECT SUM(locked_amount) FROM tokens WHERE user_id = p_investor AND campaign_id = p_campaign_id), 0) < p_qty THEN
    RAISE EXCEPTION 'insufficient_locked_balance';
  END IF;

  FOR rec IN
    SELECT * FROM tokens
    WHERE user_id = p_investor AND campaign_id = p_campaign_id AND locked_amount > 0
    ORDER BY created_at DESC, id DESC
    FOR UPDATE
  LOOP
    EXIT WHEN remaining <= 0;
    portion := LEAST(rec.locked_amount, remaining);
    UPDATE tokens SET locked_amount = locked_amount - portion WHERE id = rec.id;
    remaining := remaining - portion;
  END LOOP;

  RETURN QUERY
  SELECT COALESCE(SUM(amount - locked_amount), 0), COALESCE(SUM(locked_amount), 0)
  FROM tokens WHERE user_id = p_investor AND campaign_id = p_campaign_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION commit_token_transfer(
  p_seller uuid,
  p_buyer uuid,
  p_campaign_id bigint,
  p_qty numeric
)
RETURNS json AS $$
DECLARE
  rec tokens%ROWTYPE;
  remaining numeric := p_qty;
  portion numeric;
  symbol text;
BEGIN
  IF COALESCE((SELECT SUM(locked_amount) FROM tokens WHERE user_id = p_seller AND campaign_id = p_campaign_id), 0) < p_qty THEN
    RAISE EXCEPTION 'seller_insufficient_locked_balance';
  END IF;

  FOR rec IN
    SELECT * FROM tokens
    WHERE user_id = p_seller AND campaign_id = p_campaign_id AND locked_amount > 0
    ORDER BY created_at, id
    FOR UPDATE
  LOOP
    EXIT WHEN remaining <= 0;
    portion := LEAST(rec.locked_amount, remaining);
    symbol := COALESCE(symbol, rec.token_symbol);
    UPDATE tokens
    SET amount = amount - portion, locked_amount = locked_amount - portion
    WHERE id = rec.id;
    remaining := remaining - portion;
  END LOOP;

  INSERT INTO tokens (user_id, campaign_id, amount, locked_amount, token_symbol)
  VALUES (p_buyer, p_campaign_id, p_qty, 0, symbol);

  RETURN json_build_object('seller_id', p_seller, 'buyer_id', p_buyer, 'quantity', p_qty);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION rollback_token_transfer(
  p_seller uuid,
  p_buyer uuid,
  p_campaign_id bigint,
  p_qty numeric
)
RETURNS void AS $$
DECLARE
  rec tokens%ROWTYPE;
  remaining numeric := p_qty;
  portion numeric;
  symbol text;
BEGIN
  IF COALESCE((SELECT SUM(amount - locked_amount) FROM tokens WHERE user_id = p_buyer AND campaign_id = p_campaign_id), 0) < p_qty THEN
    RAISE EXCEPTION 'buyer_insufficient_available_balance';
  END IF;

  FOR rec IN
    SELECT * FROM tokens
    WHERE user_id = p_buyer AND campaign_id = p_campaign_id AND amount > locked_amount
    ORDER BY created_at DESC, id DESC
    FOR UPDATE
  LOOP
    EXIT WHEN remaining <= 0;
    portion := LEAST(rec.amount - rec.locked_amount, remaining);
    symbol := COALESCE(symbol, rec.token_symbol);
    UPDATE tokens SET amount = amount - portion WHERE id = rec.id;
    remaining := remaining - portion;
  END LOOP;

  INSERT INTO tokens (user_id, campaign_id, amount, locked_amount, token_symbol)
  VALUES (p_seller, p_campaign_id, p_qty, p_qty, symbol);
END;
$$ LANGUAGE plpgsql;
