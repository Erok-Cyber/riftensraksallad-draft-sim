// Public Supabase client configuration.
// The anon key is designed to be public. Access to team rows is additionally
// protected by a team access code sent in x-team-key and checked by RLS.
//
// These values are intentionally blank until the Supabase project is provisioned.
window.RIFT_DB_CONFIG = {
  provider: "supabase",
  enabled: false,
  url: "",
  anonKey: "",
  teamSlug: "riftensraksallad"
};
