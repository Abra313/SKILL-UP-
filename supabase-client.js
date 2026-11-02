(() => {
  const { url: projectUrl, publishableKey } = window.SKILLUP_SUPABASE_CONFIG || {};
  if (!projectUrl || !publishableKey) {
    throw new Error("Supabase config is missing. Start the app with node --env-file=.env server.js.");
  }

  if (!window.supabase?.createClient) {
    throw new Error("Supabase client library did not load.");
  }

  window.skillUpSupabase = window.supabase.createClient(projectUrl, publishableKey);
})();
