(() => {
  const { url: projectUrl, publishableKey } = window.SKILLUP_SUPABASE_CONFIG || {};
  if (!projectUrl || !publishableKey) {
    window.SKILLUP_SUPABASE_ERROR = "Supabase settings could not be loaded. Start the app with node server.js, then open the address it prints.";
    return;
  }

  if (!window.supabase?.createClient) {
    window.SKILLUP_SUPABASE_ERROR = "The Supabase library did not load. Check your internet connection and allow cdn.jsdelivr.net.";
    return;
  }

  try {
    window.skillUpSupabase = window.supabase.createClient(projectUrl, publishableKey);
    delete window.SKILLUP_SUPABASE_ERROR;
  } catch (error) {
    window.SKILLUP_SUPABASE_ERROR = `Supabase could not start: ${error.message || "check the project URL and publishable key."}`;
  }
})();
