// cobalt: Supabase settings for accounts, chat, the shop and game requests.
// Get these from Supabase → Project Settings → API (or "API Keys"):
//   url      = Project URL
//   anonKey  = the "anon" / "public" key (safe to publish; NEVER put the service_role / secret key here)
// Leave url empty to turn accounts off.
window.COBALT_SUPABASE = {
  url: "https://mcwygeyvhntgkaqijgnx.supabase.co",
  anonKey: "sb_publishable_3NASLlQhzHx2d1TYTEXviw_5NdOQhmb",
  // After you sign in on your site: Settings → Copy ID, paste it here AND into supabase.sql, then run supabase.sql again.
  ownerUid: "dae5f3b4-a537-4c93-92a3-2823762ff82c",
  // Set to true only after you turn on Google sign-in in Supabase (Authentication → Providers → Google).
  google: false
};
