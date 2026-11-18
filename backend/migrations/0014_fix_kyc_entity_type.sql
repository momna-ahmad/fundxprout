-- backend/migrations/0014_fix_kyc_entity_type.sql
-- NOTE: The DB has a CHECK constraint "verification_sessions_entity_type_check"
-- that only allows 'user' | 'business'. We cannot change entity_type to 'profile'.
-- The fix was applied in code instead:
--   - diditRoutes.js: uses entity_type='user' (no change needed)
--   - orderValidationService.js: now queries entity_type='user' (was wrongly 'profile')
--
-- This migration only adjusts the CHECK constraint to also allow 'profile' in
-- case future code ever needs it. OPTIONAL — only run if you want to expand the allowed values.

-- OPTIONAL: Expand the entity_type CHECK constraint to also accept 'profile'
-- (only run this if you encounter issues with entity_type in the future)
ALTER TABLE public.verification_sessions
  DROP CONSTRAINT IF EXISTS verification_sessions_entity_type_check;

ALTER TABLE public.verification_sessions
  ADD CONSTRAINT verification_sessions_entity_type_check
  CHECK (entity_type IN ('user', 'business', 'profile'));
