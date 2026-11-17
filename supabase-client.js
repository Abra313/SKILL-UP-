(() => {
  const config = window.SKILL_UP_SUPABASE_CONFIG;
  if (!config?.url || !config?.publishableKey || !window.supabase?.createClient) {
    window.skillUpSupabaseError = "Account service configuration or the required client library is missing.";
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
    window.skillUpSupabaseError = "Account authentication could not be initialized. Refresh the page and check the required client library.";
    return;
  }
  const saveQueues = new Map();
  const courseMaterialBucket = "course-videos";

  function formatAuthenticatorError(error) {
    const message = error?.message || String(error || "Authenticator verification failed.");
    if (/invalid totp|invalid code/i.test(message)) {
      return "The code was rejected. Check your device's automatic date and time, make sure you selected the SKILL-UP entry in your authenticator app, and enter a fresh 6-digit code before it expires.";
    }
    return message;
  }

  async function uploadCourseMaterial(path, file) {
    const { data, error } = await client.storage.from(courseMaterialBucket).upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false
    });
    if (error) throw error;
    if (!data?.path) throw new Error("Storage did not return the uploaded file path.");
    return data.path;
  }

  async function createCourseMaterialSignedUrl(path) {
    const { data, error } = await client.storage.from(courseMaterialBucket).createSignedUrl(path, 3600);
    if (error) throw error;
    if (!data?.signedUrl) throw new Error("Storage did not return a signed lesson URL.");
    return data.signedUrl;
  }

  async function removeCourseMaterials(paths) {
    const uniquePaths = [...new Set(paths.filter(Boolean))];
    if (!uniquePaths.length) return;
    const { error } = await client.storage.from(courseMaterialBucket).remove(uniquePaths);
    if (error) throw error;
  }

  async function invokeBunnyCourseMedia(action, payload = {}) {
    const { data, error } = await client.functions.invoke("bunny-course-media", {
      body: { action, ...payload }
    });
    if (error) {
      let message = error.message;
      if (error.context?.clone) {
        try {
          const response = await error.context.clone().json();
          if (response?.error) message = response.error;
        } catch {
          // Keep the original Functions error when its response is not JSON.
        }
      }
      throw new Error(message);
    }
    if (!data || typeof data !== "object") {
      throw new Error("Bunny Stream returned an invalid response.");
    }
    if (data.error) throw new Error(String(data.error));
    return data;
  }

  async function createBunnyUpload(fileName, mimeType, size) {
    return invokeBunnyCourseMedia("create-upload", { fileName, mimeType, size });
  }

  async function createBunnyPlaybackUrl(courseId, videoId) {
    const data = await invokeBunnyCourseMedia("sign-playback", { courseId, videoId });
    if (typeof data.url !== "string" || !data.url) {
      throw new Error("Bunny Stream did not return a playback URL.");
    }
    return data.url;
  }

  async function removeBunnyVideos(videoIds) {
    const uniqueIds = [...new Set(videoIds.filter(Boolean))];
    for (let index = 0; index < uniqueIds.length; index += 100) {
      await invokeBunnyCourseMedia("delete-videos", {
        videoIds: uniqueIds.slice(index, index + 100)
      });
    }
  }

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
      if (!user) throw new Error("Your session has expired. Sign in again to sync changes.");

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

  async function loadPrivacyPreferences(userId) {
    const { data, error } = await client.from("user_privacy_preferences")
      .select("user_id,product_email,marketing_email,sms_notifications,whatsapp_notifications,analytics_cookies,third_party_sharing,updated_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  function isPrivacySchemaMissing(error) {
    return error?.code === "PGRST205" &&
      /public\.(?:user_privacy_preferences|privacy_requests)/i.test(error.message || "");
  }

  async function savePrivacyPreferences(userId, preferences) {
    const updatedAt = new Date().toISOString();
    const { data, error } = await client.from("user_privacy_preferences")
      .upsert({
        user_id: userId,
        product_email: Boolean(preferences.product_email),
        marketing_email: Boolean(preferences.marketing_email),
        sms_notifications: Boolean(preferences.sms_notifications),
        whatsapp_notifications: Boolean(preferences.whatsapp_notifications),
        analytics_cookies: Boolean(preferences.analytics_cookies),
        third_party_sharing: Boolean(preferences.third_party_sharing),
        updated_at: updatedAt
      }, { onConflict: "user_id" })
      .select("user_id,product_email,marketing_email,sms_notifications,whatsapp_notifications,analytics_cookies,third_party_sharing,updated_at")
      .single();
    if (error) throw error;
    return data;
  }

  async function loadPrivacyRequests(userId) {
    const { data, error } = await client.from("privacy_requests")
      .select("id,request_type,details,status,created_at,updated_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function createPrivacyRequest(userId, requestType, details) {
    const { data, error } = await client.from("privacy_requests")
      .insert({ user_id: userId, request_type: requestType, details })
      .select("id,request_type,details,status,created_at,updated_at")
      .single();
    if (error) throw error;
    return data;
  }

  function subscribePrivacyCenter(userId, onChange, onError) {
    return client.channel(`privacy-center:${userId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "user_privacy_preferences",
        filter: `user_id=eq.${userId}`
      }, onChange)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "privacy_requests",
        filter: `user_id=eq.${userId}`
      }, onChange)
      .subscribe((status, error) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          onError(error || new Error(`Privacy updates could not connect (${status}).`));
        }
      });
  }

  async function getPrivacyExport(userId) {
    const [authResult, profile, workspace, preferences, requests] = await Promise.all([
      client.auth.getUser(),
      getProfile(userId),
      loadWorkspace(`learner:${userId}`),
      loadPrivacyPreferences(userId),
      loadPrivacyRequests(userId)
    ]);
    if (authResult.error) throw authResult.error;
    const user = authResult.data.user;
    if (!user || user.id !== userId) throw new Error("Could not verify the account for this data export.");
    return {
      exportedAt: new Date().toISOString(),
      authAccount: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at,
        userMetadata: user.user_metadata
      },
      account: profile,
      learnerData: workspace,
      privacyPreferences: preferences,
      privacyRequests: requests
    };
  }

  async function getMyReferralSummary() {
    const { data, error } = await client.rpc("get_my_referral_summary");
    if (error) throw error;
    if (!data) throw new Error("Your referral account is not available yet.");
    return data;
  }

  async function getReferralAdminSummary() {
    const [summaryResult, settingsResult] = await Promise.all([
      client.rpc("get_referral_admin_summary"),
      client.from("referral_program_settings").select("commission_rate").eq("singleton", true).single()
    ]);
    if (summaryResult.error) throw summaryResult.error;
    if (settingsResult.error) throw settingsResult.error;
    return {
      partners: summaryResult.data || [],
      rate: Number(settingsResult.data.commission_rate)
    };
  }

  function subscribeReferrals(userId, onChange, onError, admin = false) {
    const channel = client.channel(admin ? "admin-referrals" : `referrals:${userId}`);
    channel.on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "referral_attributions",
      ...(admin ? {} : { filter: `referrer_user_id=eq.${userId}` })
    }, onChange);
    channel.on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "referral_commissions",
      ...(admin ? {} : { filter: `referrer_user_id=eq.${userId}` })
    }, onChange);
    channel.on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "referral_program_settings"
    }, onChange);
    return channel.subscribe((status, error) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        onError(error || new Error(`Live referral updates could not connect (${status}).`));
      }
    });
  }

  window.skillUpSupabase = {
    client,
    formatAuthenticatorError,
    getProfile,
    updateProfile,
    loadWorkspace,
    saveWorkspace,
    uploadCourseMaterial,
    createCourseMaterialSignedUrl,
    removeCourseMaterials,
    createBunnyUpload,
    createBunnyPlaybackUrl,
    removeBunnyVideos,
    loadLearnerWorkspaces,
    loadPrivacyPreferences,
    savePrivacyPreferences,
    isPrivacySchemaMissing,
    loadPrivacyRequests,
    createPrivacyRequest,
    subscribePrivacyCenter,
    getPrivacyExport,
    getMyReferralSummary,
    getReferralAdminSummary,
    subscribeReferrals
  };
})();
