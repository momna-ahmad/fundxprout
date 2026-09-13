-- backend/migrations/0006_notification_triggers.sql
-- Automated Database Triggers & Realtime for FundXProut Notification System.
-- Paste and run this script in your Supabase SQL Editor.

-- ─────────────────────────────────────────────────────────────
-- 1. Shared Notification Inserter (Idempotent Helper)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_create_notification(
  p_user_id   uuid,
  p_type      text,
  p_title     text,
  p_message   text,
  p_link      text DEFAULT NULL,
  p_metadata  jsonb DEFAULT '{}'::jsonb
) RETURNS void AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN;
  END IF;

  -- De-duplicate identical notifications within a 5-second window
  IF NOT EXISTS (
    SELECT 1 FROM public.notifications
    WHERE user_id = p_user_id
      AND type = p_type
      AND message = p_message
      AND created_at > (now() - interval '5 seconds')
  ) THEN
    INSERT INTO public.notifications (user_id, type, title, message, link, metadata, is_read, created_at)
    VALUES (p_user_id, p_type, p_title, p_message, p_link, p_metadata, false, now());
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────
-- 2. Trigger on Campaign Status & Funding Milestones
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_trg_campaign_notifications()
RETURNS trigger AS $$
BEGIN
  -- Status updates
  IF (OLD.status IS DISTINCT FROM NEW.status) THEN
    IF (NEW.status IN ('approved', 'launched')) THEN
      PERFORM public.fn_create_notification(
        NEW.owner,
        'campaign_approved',
        'Campaign Approved',
        'Your campaign "' || COALESCE(NEW.title, 'Equity Raising') || '" has been approved by admin and is now live!',
        '/campaign/' || NEW.id,
        jsonb_build_object('campaign_id', NEW.id)
      );
    ELSIF (NEW.status = 'rejected') THEN
      PERFORM public.fn_create_notification(
        NEW.owner,
        'campaign_rejected',
        'Campaign Verification Update',
        'Your campaign "' || COALESCE(NEW.title, 'Equity Raising') || '" was rejected.',
        '/dashboard',
        jsonb_build_object('campaign_id', NEW.id)
      );
    ELSIF (NEW.status = 'failed') THEN
      PERFORM public.fn_create_notification(
        NEW.owner,
        'campaign_failed',
        'Campaign Goal Missed',
        'Your campaign "' || COALESCE(NEW.title, 'Equity Raising') || '" ended without reaching its funding target.',
        '/dashboard',
        jsonb_build_object('campaign_id', NEW.id)
      );
    ELSIF (NEW.status = 'successful') THEN
      PERFORM public.fn_create_notification(
        NEW.owner,
        'campaign_approved',
        'Funding Target Reached!',
        'Congratulations! Your campaign "' || COALESCE(NEW.title, 'Equity Raising') || '" successfully reached its funding target!',
        '/campaign/' || NEW.id,
        jsonb_build_object('campaign_id', NEW.id)
      );
    END IF;
  END IF;

  -- Funding Goal 100% Milestone
  IF (COALESCE(OLD.amount_pledged, 0) < COALESCE(NEW.funding_goal, 0)) AND 
     (COALESCE(NEW.amount_pledged, 0) >= COALESCE(NEW.funding_goal, 0)) AND 
     (COALESCE(NEW.funding_goal, 0) > 0) THEN
    PERFORM public.fn_create_notification(
      NEW.owner,
      'campaign_approved',
      'Target Funding Goal Reached!',
      'Milestone Achieved! Your campaign "' || COALESCE(NEW.title, 'Equity Raising') || '" hit 100% of its funding goal!',
      '/dashboard',
      jsonb_build_object('campaign_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_campaign_notifications ON public.campaigns;
CREATE TRIGGER trg_campaign_notifications
  AFTER UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_trg_campaign_notifications();

-- ─────────────────────────────────────────────────────────────
-- 3. Trigger on Investments / Pledges
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_trg_investment_notifications()
RETURNS trigger AS $$
DECLARE
  v_owner uuid;
  v_title text;
BEGIN
  SELECT owner, title INTO v_owner, v_title
  FROM public.campaigns
  WHERE id = NEW.campaign_id;

  IF v_owner IS NOT NULL THEN
    PERFORM public.fn_create_notification(
      v_owner,
      'bid_received',
      'New Investment Received',
      'An investor pledged ' || NEW.amount || ' ETH to your campaign "' || COALESCE(v_title, 'Equity Raising') || '".',
      '/dashboard',
      jsonb_build_object('campaign_id', NEW.campaign_id, 'amount', NEW.amount, 'investor_id', NEW.investor_id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_investment_notifications ON public.investments;
CREATE TRIGGER trg_investment_notifications
  AFTER INSERT ON public.investments
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_trg_investment_notifications();

-- ─────────────────────────────────────────────────────────────
-- 4. Trigger on Secondary Market Bids & Offers
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_trg_token_bid_notifications()
RETURNS trigger AS $$
DECLARE
  v_seller uuid;
  v_title  text;
BEGIN
  SELECT title INTO v_title FROM public.campaigns WHERE id = NEW.campaign_id;
  SELECT investor_id INTO v_seller FROM public.token_orders WHERE id = NEW.listing_id;

  -- New Bid Placed
  IF (TG_OP = 'INSERT') THEN
    IF v_seller IS NOT NULL THEN
      PERFORM public.fn_create_notification(
        v_seller,
        'bid_received',
        'New Bid Received',
        'Someone placed a bid of ' || NEW.bid_price_per_token || ' ETH/token on your "' || COALESCE(v_title, 'listing') || '" listing.',
        '/investor-dashboard/my-listings',
        jsonb_build_object('bid_id', NEW.id, 'listing_id', NEW.listing_id, 'campaign_id', NEW.campaign_id)
      );
    END IF;

  -- Bid Status Update
  ELSIF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    IF (NEW.status = 'accepted') THEN
      PERFORM public.fn_create_notification(
        NEW.buyer_id,
        'bid_accepted',
        'Your Bid Was Accepted',
        'Your offer on "' || COALESCE(v_title, 'a listing') || '" was accepted! You have 24 hours to confirm the purchase.',
        '/investor-dashboard/my-bids',
        jsonb_build_object('bid_id', NEW.id, 'campaign_id', NEW.campaign_id)
      );
    ELSIF (NEW.status = 'rejected') THEN
      PERFORM public.fn_create_notification(
        NEW.buyer_id,
        'bid_rejected',
        'Bid Rejected',
        'Your offer of ' || NEW.bid_price_per_token || ' ETH/token on "' || COALESCE(v_title, 'a listing') || '" was rejected by the seller.',
        '/investor-dashboard/my-bids',
        jsonb_build_object('bid_id', NEW.id, 'campaign_id', NEW.campaign_id)
      );
    ELSIF (NEW.status = 'completed') THEN
      -- Notify Buyer
      PERFORM public.fn_create_notification(
        NEW.buyer_id,
        'trade_completed',
        'Trade Completed',
        'Your token purchase from "' || COALESCE(v_title, 'a campaign') || '" has settled on-chain!',
        '/investor-dashboard/my-bids',
        jsonb_build_object('bid_id', NEW.id, 'campaign_id', NEW.campaign_id)
      );
      -- Notify Seller
      IF v_seller IS NOT NULL THEN
        PERFORM public.fn_create_notification(
          v_seller,
          'trade_completed',
          'Your Tokens Were Sold',
          'Your token sale for "' || COALESCE(v_title, 'a campaign') || '" has settled on-chain!',
          '/investor-dashboard/my-listings',
          jsonb_build_object('bid_id', NEW.id, 'campaign_id', NEW.campaign_id)
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_token_bid_notifications ON public.token_bids;
CREATE TRIGGER trg_token_bid_notifications
  AFTER INSERT OR UPDATE ON public.token_bids
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_trg_token_bid_notifications();

-- ─────────────────────────────────────────────────────────────
-- 5. Trigger on Verification Status (KYC & KYB)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_trg_profile_kyc_notifications()
RETURNS trigger AS $$
BEGIN
  IF (OLD.identity_verified IS FALSE AND NEW.identity_verified IS TRUE) THEN
    PERFORM public.fn_create_notification(
      NEW.user_id,
      'kyc_status',
      'Identity Verified',
      'Your KYC identity verification has been approved! You can now trade and invest on FundXprout.',
      '/dashboard/profile',
      '{}'::jsonb
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_profile_kyc_notifications ON public.profiles;
CREATE TRIGGER trg_profile_kyc_notifications
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_trg_profile_kyc_notifications();

CREATE OR REPLACE FUNCTION public.fn_trg_business_kyb_notifications()
RETURNS trigger AS $$
BEGIN
  IF (OLD.kyb_verified IS FALSE AND NEW.kyb_verified IS TRUE) THEN
    PERFORM public.fn_create_notification(
      NEW.owner_id,
      'kyb_status',
      'Business Verified',
      'Your KYB business verification has been approved! You can now launch fundraising campaigns.',
      '/dashboard/profile',
      '{}'::jsonb
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_business_kyb_notifications ON public.businesses;
CREATE TRIGGER trg_business_kyb_notifications
  AFTER UPDATE ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_trg_business_kyb_notifications();

-- ─────────────────────────────────────────────────────────────
-- 6. Trigger on Admin Action Logs
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_trg_admin_action_notifications()
RETURNS trigger AS $$
DECLARE
  v_owner uuid;
  v_title text;
BEGIN
  IF NEW.target_type = 'campaign' AND NEW.target_id IS NOT NULL THEN
    SELECT owner, title INTO v_owner, v_title FROM public.campaigns WHERE id = NEW.target_id::bigint;
    IF v_owner IS NOT NULL THEN
      PERFORM public.fn_create_notification(
        v_owner,
        'campaign_approved',
        'Admin Action Update',
        'Admin action on campaign "' || COALESCE(v_title, NEW.target_id) || '": ' || COALESCE(NEW.notes, NEW.action_type),
        '/dashboard',
        jsonb_build_object('campaign_id', NEW.target_id)
      );
    END IF;
  ELSIF NEW.target_type = 'profile' AND NEW.target_id IS NOT NULL THEN
    PERFORM public.fn_create_notification(
      NEW.target_id::uuid,
      'kyc_status',
      'Account Security Update',
      'Admin action on your profile: ' || COALESCE(NEW.notes, NEW.action_type),
      '/dashboard/profile',
      '{}'::jsonb
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_admin_action_notifications ON public.admin_actions;
CREATE TRIGGER trg_admin_action_notifications
  AFTER INSERT ON public.admin_actions
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_trg_admin_action_notifications();

-- ─────────────────────────────────────────────────────────────
-- 7. Enable Supabase Realtime for Notifications Table
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
