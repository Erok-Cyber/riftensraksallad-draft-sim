// Riftensräksallad shared match database.
// No secret database credentials are stored in GitHub.
// The Edge Function validates the per-device team access code server-side.
window.RIFT_DB_CONFIG = {
  provider: "supabase-edge",
  enabled: true,
  functionUrl: "https://enzrxndugnfseekdgauh.supabase.co/functions/v1/rift-team-matches",
  plannerFunctionUrl: "https://enzrxndugnfseekdgauh.supabase.co/functions/v1/rift-team-planner",
  teamSlug: "riftensraksallad"
};
