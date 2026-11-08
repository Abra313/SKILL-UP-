(() => {
  if (!window.skillUpSupabase) {
    window.skillUpAuth = {
      async requireRole() {
        window.location.replace(`auth.html?mode=login&error=${encodeURIComponent(window.skillUpSupabaseError || "The account service could not be loaded.")}`);
        return null;
      },
      async signOut() { window.location.replace("auth.html?mode=login"); }
    };
    return;
  }
  const { client, getProfile } = window.skillUpSupabase;
  if (!client?.auth || typeof client.auth.getSession !== "function" ||
      typeof client.auth.signOut !== "function" || typeof getProfile !== "function") {
    window.skillUpSupabaseError = "Account authentication could not be initialized. Refresh the page and check the account service.";
    window.skillUpAuth = {
      async requireRole() {
        window.location.replace(`auth.html?mode=login&error=${encodeURIComponent(window.skillUpSupabaseError)}`);
        return null;
      },
      async signOut() { window.location.replace("auth.html?mode=login"); }
    };
    return;
  }

  async function getSession() {
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    const user = data.session?.user;
    if (!user) return null;
    const profile = await getProfile(user.id);
    return {
      id: user.id,
      email: user.email || profile.email,
      name: profile.full_name || user.user_metadata?.full_name || user.email || "",
      role: profile.role === "user" ? "learner" : profile.role
    };
  }

  async function requireRole(role) {
    let session;
    try {
      session = await getSession();
    } catch (error) {
      console.error("Could not validate the Supabase session:", error);
      window.location.replace(`auth.html?mode=login&error=${encodeURIComponent("Could not verify your account. Check the account service setup and try again.")}`);
      return null;
    }
    if (!session || session.role !== role) {
      window.location.replace("auth.html?mode=login");
      return null;
    }
    if (client.auth.mfa?.getAuthenticatorAssuranceLevel) {
      try {
        const { data: assurance, error } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
        if (error) throw error;
        if (assurance.nextLevel === "aal2" && assurance.currentLevel !== "aal2") {
          window.location.replace("auth.html?mode=mfa");
          return null;
        }
      } catch (error) {
        console.error("Could not verify the account's multi-factor assurance level:", error);
        window.location.replace(`auth.html?mode=login&error=${encodeURIComponent("Could not verify your security level. Sign in again.")}`);
        return null;
      }
    }
    return session;
  }

  async function signOut() {
    const { error } = await client.auth.signOut();
    if (error) throw error;
    window.location.replace("auth.html?mode=login");
  }

  document.querySelectorAll("[data-sign-out]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      button.setAttribute("aria-busy", "true");
      try {
        await signOut();
      } catch (error) {
        button.removeAttribute("aria-busy");
        console.error("Could not sign out:", error);
        const region = document.querySelector("#toast-region, #learner-toast-region");
        if (region) {
          const toast = document.createElement("div");
          toast.className = "toast error";
          toast.textContent = `Could not sign out: ${error.message}`;
          region.append(toast);
        }
      }
    });
  });

  window.skillUpAuth = { getSession, requireRole, signOut };
})();
