(() => {
  const form = document.querySelector("#auth-form");
  const nameField = document.querySelector("#name-field");
  const confirmField = document.querySelector("#confirm-field");
  const nameInput = document.querySelector("#full-name");
  const emailInput = document.querySelector("#email");
  const passwordInput = document.querySelector("#password");
  const confirmInput = document.querySelector("#confirm-password");
  const heading = document.querySelector("#auth-heading");
  const description = document.querySelector("#auth-description");
  const submitButton = document.querySelector("#submit-button span:first-child");
  const loginTab = document.querySelector("#login-tab");
  const registerTab = document.querySelector("#register-tab");
  const switchMessage = document.querySelector("#auth-switch");
  const message = document.querySelector("#auth-message");
  const messageText = document.querySelector("#auth-message-text");
  const setupLink = document.querySelector("#auth-setup-link");
  let mode = new URLSearchParams(location.search).get("mode") === "register" ? "register" : "login";

  function showMessage(text, isError = false, setupRequired = false) {
    messageText.textContent = text;
    message.classList.toggle("error", isError);
    setupLink.hidden = !setupRequired;
    message.hidden = false;
  }

  function getAuthError(error) {
    if (error?.code === "PGRST205" ||
        /could not find the table ['"]?public\.profiles['"]? in the schema cache/i.test(error?.message || "")) {
      return {
        message: "The Supabase profiles table is missing. Apply the database setup in SUPABASE_SETUP.md, then refresh this page.",
        setupRequired: true
      };
    }
    if (/database error (saving|adding) new user/i.test(error?.message || "")) {
      return {
        message: "Supabase could not create the learner profile. Apply the latest database migrations using the setup instructions, then check Supabase Auth logs if the issue continues.",
        setupRequired: true
      };
    }
    return { message: error?.message || "Could not complete sign-in. Please try again.", setupRequired: false };
  }

  if (!window.skillUpSupabase) {
    showMessage(window.skillUpSupabaseError || "Supabase could not be loaded. Check your connection and configuration.", true);
    form.querySelectorAll("input, button").forEach((control) => { control.disabled = true; });
    return;
  }
  const { client, getProfile } = window.skillUpSupabase;
  if (!client?.auth || typeof client.auth.getSession !== "function" ||
      typeof client.auth.signInWithPassword !== "function" ||
      typeof client.auth.signUp !== "function" || typeof getProfile !== "function") {
    showMessage("Supabase authentication could not be initialized. Refresh the page and check your connection.", true);
    form.querySelectorAll("input, button").forEach((control) => { control.disabled = true; });
    return;
  }

  function setMode(nextMode) {
    mode = nextMode;
    const registering = mode === "register";
    nameField.hidden = !registering;
    confirmField.hidden = !registering;
    nameInput.required = registering;
    confirmInput.required = registering;
    passwordInput.autocomplete = registering ? "new-password" : "current-password";
    heading.textContent = registering ? "Create your account" : "Welcome back";
    description.textContent = registering ? "Register to start learning with SKILL-UP." : "Sign in to continue to your SKILL-UP workspace.";
    submitButton.textContent = registering ? "Create account" : "Log in";
    loginTab.classList.toggle("active", !registering);
    registerTab.classList.toggle("active", registering);
    loginTab.setAttribute("aria-selected", String(!registering));
    registerTab.setAttribute("aria-selected", String(registering));
    switchMessage.innerHTML = registering
      ? 'Already have an account? <button type="button" data-set-mode="login">Log in</button>'
      : 'New to SKILL-UP? <button type="button" data-set-mode="register">Create an account</button>';
    message.hidden = true;
    setupLink.hidden = true;
  }

  async function routeSession(user) {
    const profile = await getProfile(user.id);
    const role = profile.role === "user" ? "learner" : profile.role;
    const destination = role === "admin" ? "admin.html" : role === "learner" ? "student.html" : null;
    if (!destination) throw new Error("This account does not have an application role. Contact an administrator.");
    window.location.assign(destination);
  }

  document.querySelector("#auth-tabs").addEventListener("click", (event) => {
    const tab = event.target.closest("#login-tab, #register-tab");
    if (tab) setMode(tab.id === "register-tab" ? "register" : "login");
  });
  switchMessage.addEventListener("click", (event) => {
    const button = event.target.closest("[data-set-mode]");
    if (button) setMode(button.dataset.setMode);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    message.hidden = true;
    if (!form.reportValidity()) return;

    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;
    try {
      if (mode === "register") {
        const name = nameInput.value.trim();
        if (name.length < 2) {
          showMessage("Enter your name using at least two characters.", true);
          nameInput.focus();
          return;
        }
        if (password !== confirmInput.value) {
          showMessage("The passwords do not match.", true);
          confirmInput.focus();
          return;
        }
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } }
        });
        if (error) throw error;
        if (!data.session) {
          setMode("login");
          emailInput.value = email;
          showMessage("Account created. Check your email to confirm it, then log in.", false);
          return;
        }
        await routeSession(data.user);
        return;
      }

      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await routeSession(data.user);
    } catch (error) {
      const authError = getAuthError(error);
      showMessage(authError.message, true, authError.setupRequired);
    }
  });

  setMode(mode);
  const queryError = new URLSearchParams(location.search).get("error");
  if (queryError) showMessage(queryError, true);
})();
