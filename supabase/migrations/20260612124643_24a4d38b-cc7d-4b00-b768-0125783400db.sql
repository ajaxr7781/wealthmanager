
-- Trigger functions: only the database needs to invoke these
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- One-time migration utility: admins/service only
REVOKE EXECUTE ON FUNCTION public.migrate_to_unified_assets() FROM PUBLIC, anon, authenticated;

-- RLS helper functions: only signed-in users need execute (used in policies)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_mf_holding_ids(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_portfolio_ids(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_mf_scheme_ids(uuid) FROM PUBLIC, anon;
