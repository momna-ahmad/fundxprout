CREATE TABLE token_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id bigint NOT NULL REFERENCES campaigns(id),
    investor_id uuid NOT NULL REFERENCES profiles(user_id),
    side text NOT NULL CHECK (side IN ('buy','sell')),
    order_type text NOT NULL DEFAULT 'limit' CHECK (order_type IN ('limit')),
    price numeric NOT NULL,
    quantity numeric NOT NULL,
    quantity_filled numeric NOT NULL DEFAULT 0,
    quantity_remaining numeric NOT NULL,
    status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','partially_filled','filled','cancelled','expired')),
    version integer NOT NULL DEFAULT 0,
    expires_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE token_trades (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id bigint NOT NULL REFERENCES campaigns(id),
    buy_order_id uuid NOT NULL REFERENCES token_orders(id),
    sell_order_id uuid NOT NULL REFERENCES token_orders(id),
    buyer_id uuid NOT NULL REFERENCES profiles(user_id),
    seller_id uuid NOT NULL REFERENCES profiles(user_id),
    price numeric NOT NULL,
    quantity numeric NOT NULL,
    fee_amount numeric NOT NULL DEFAULT 0,
    tx_hash text,
    settlement_status text NOT NULL DEFAULT 'pending' CHECK (settlement_status IN ('pending','settled','failed')),
    executed_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE token_holdings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id bigint NOT NULL REFERENCES campaigns(id),
    investor_id uuid NOT NULL REFERENCES profiles(user_id),
    available_balance numeric NOT NULL DEFAULT 0,
    locked_balance numeric NOT NULL DEFAULT 0,
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (campaign_id, investor_id)
);

CREATE TABLE valuation_snapshots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id bigint NOT NULL REFERENCES campaigns(id),
    price numeric NOT NULL,
    source text NOT NULL CHECK (source IN ('primary_issue','last_trade','manual_revaluation')),
    recorded_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE campaign_secondary_market_settings (
    campaign_id bigint PRIMARY KEY REFERENCES campaigns(id),
    trading_enabled boolean NOT NULL DEFAULT false,
    lockup_days integer NOT NULL DEFAULT 0,
    price_band_percent numeric NOT NULL DEFAULT 20,
    min_order_size numeric,
    max_order_size numeric,
    fee_bps integer NOT NULL DEFAULT 50,
    trading_opened_at timestamp with time zone
);

ALTER TABLE campaigns
    ADD COLUMN last_traded_price numeric,
    ADD COLUMN secondary_trading_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE investments
    ADD COLUMN lockup_expires_at timestamp with time zone;

ALTER TABLE profiles
    ADD COLUMN trading_restricted boolean NOT NULL DEFAULT false,
    ADD COLUMN wallet_address text,
    ADD COLUMN wallet_verified boolean NOT NULL DEFAULT false;

CREATE INDEX idx_token_orders_campaign_status ON token_orders(campaign_id, status);
CREATE INDEX idx_token_orders_investor_id ON token_orders(investor_id);
CREATE INDEX idx_token_trades_campaign_id ON token_trades(campaign_id);
CREATE INDEX idx_token_holdings_investor_id ON token_holdings(investor_id);

COMMENT ON COLUMN campaign_secondary_market_settings.lockup_days IS 'Defaults to 0 for development and must be set intentionally before production launch.';
