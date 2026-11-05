(() => {
  const config = window.SKILL_UP_SUPABASE_CONFIG;
  if (!config?.url || !config?.publishableKey || !window.supabase?.createClient) {
    window.skillUpSupabaseError = "Supabase configuration or the Supabase client library is missing.";
    return;
  }

  const client = window.supabase.createClient(config.url, config.publishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
      storage: window.sessionStorage
    }
  });
  if (!client?.auth || typeof client.auth.getSession !== "function" ||
      typeof client.auth.signInWithPassword !== "function" ||
      typeof client.auth.signUp !== "function") {
    window.skillUpSupabaseError = "Supabase authentication could not be initialized. Refresh the page and check the Supabase client library.";
    return;
  }
  const saveQueues = new Map();

  async function getProfile(userId) {
    const { data, error } = await client.from("profiles")
      .select("id,email,full_name,role")
      .eq("id", userId)
      .single();
    if (error) throw error;
    return data;
  }

  async function updateProfile(userId, fullName) {
    const { data, error } = await client.from("profiles")
      .update({ full_name: fullName })
      .eq("id", userId)
      .select("id,email,full_name,role")
      .single();
    if (error) throw error;
    return data;
  }

  async function loadWorkspace(workspaceKey) {
    const { data, error } = await client.from("app_workspaces")
      .select("data")
      .eq("workspace_key", workspaceKey)
      .maybeSingle();
    if (error) throw error;
    return data?.data ?? null;
  }

  async function saveWorkspace(workspaceKey, data) {
    const previous = saveQueues.get(workspaceKey) || Promise.resolve();
    const next = previous.catch(() => {}).then(async () => {
      const { data: sessionData, error: sessionError } = await client.auth.getSession();
      if (sessionError) throw sessionError;
      const user = sessionData.session?.user;
      if (!user) throw new Error("Your Supabase session has expired. Sign in again to sync changes.");

      const row = {
        workspace_key: workspaceKey,
        owner_id: workspaceKey.startsWith("learner:") ? workspaceKey.slice("learner:".length) : null,
        data,
        updated_at: new Date().toISOString()
      };
      const { error } = await client.from("app_workspaces").upsert(row, { onConflict: "workspace_key" });
      if (error) throw error;
    });
    saveQueues.set(workspaceKey, next);
    try {
      await next;
    } finally {
      if (saveQueues.get(workspaceKey) === next) saveQueues.delete(workspaceKey);
    }
  }

  async function loadLearnerWorkspaces() {
    const { data, error } = await client.from("app_workspaces")
      .select("workspace_key,data")
      .like("workspace_key", "learner:%");
    if (error) throw error;
    return data || [];
  }

  window.skillUpSupabase = { client, getProfile, updateProfile, loadWorkspace, saveWorkspace, loadLearnerWorkspaces };
})();
