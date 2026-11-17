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
  const submitButtonElement = document.querySelector("#submit-button");
  const submitSpinner = document.querySelector("#auth-submit-spinner");
  const submitArrow = document.querySelector("#auth-submit-arrow");
  const loginTab = document.querySelector("#login-tab");
  const registerTab = document.querySelector("#register-tab");
  const switchMessage = document.querySelector("#auth-switch");
  const message = document.querySelector("#auth-message");
  const messageText = document.querySelector("#auth-message-text");
  const setupLink = document.querySelector("#auth-setup-link");
  const mfaChallenge = document.querySelector("#mfa-challenge");
  const mfaCode = document.querySelector("#mfa-code");
  const mfaCancel = document.querySelector("#mfa-cancel");
  let mode = new URLSearchParams(location.search).get("mode") || "login";
  const referralCode = (new URLSearchParams(location.search).get("ref") || "").trim().toUpperCase();
  if (!["login", "register", "mfa", "reset", "recovery"].includes(mode)) mode = "login";

  function showMessage(text, isError = false, setupRequired = false) {
    messageText.textContent = text;
    message.classList.toggle("error", isError);
    setupLink.hidden = !setupRequired;
    message.hidden = false;
  }

  function setSubmitLoading(loading) {
    submitButtonElement.disabled = loading;
    submitButtonElement.setAttribute("aria-busy", String(loading));
    submitSpinner.hidden = !loading;
    submitArrow.hidden = loading;
  }

  function getAuthError(error) {
    if (error?.code === "PGRST205" ||
        /could not find the table ['"]?public\.profiles['"]? in the schema cache/i.test(error?.message || "")) {
      return {
        message: "The account profiles table is missing. Apply the database setup instructions, then refresh this page.",
        setupRequired: true
      };
    }
    if (/database error (saving|adding) new user/i.test(error?.message || "")) {
      return {
        message: "We couldn’t finish setting up your account. Please try again shortly. If the problem continues, contact support.",
        setupRequired: false
      };
    }
    return { message: error?.message || "Could not complete sign-in. Please try again.", setupRequired: false };
  }

  if (!window.skillUpSupabase) {
    showMessage(window.skillUpSupabaseError || "The account service could not be loaded. Check your connection and configuration.", true);
    form.querySelectorAll("input, button").forEach((control) => { control.disabled = true; });
    return;
  }
  const { client, getProfile } = window.skillUpSupabase;
  if (!client?.auth || typeof client.auth.getSession !== "function" ||
      typeof client.auth.signInWithPassword !== "function" ||
      typeof client.auth.signUp !== "function" || typeof getProfile !== "function") {
    showMessage("Account authentication could not be initialized. Refresh the page and check your connection.", true);
    form.querySelectorAll("input, button").forEach((control) => { control.disabled = true; });
    return;
  }

  function setMode(nextMode) {
    mode = nextMode;
    const registering = mode === "register";
    const requestingRecovery = mode === "reset";
    const recovering = mode === "recovery";
    mfaChallenge.hidden = true;
    form.hidden = false;
    document.querySelector("#auth-tabs").hidden = requestingRecovery || recovering;
    switchMessage.hidden = false;
    nameField.hidden = !registering;
    passwordInput.closest(".form-field").hidden = requestingRecovery;
    confirmField.hidden = !registering && !recovering;
    emailInput.closest(".form-field").hidden = recovering;
    emailInput.required = !recovering;
    nameInput.required = registering;
    passwordInput.required = !requestingRecovery;
    confirmInput.required = registering || recovering;
    passwordInput.autocomplete = registering || recovering ? "new-password" : "current-password";
    confirmField.querySelector("label").textContent = recovering ? "Confirm new password" : "Confirm password";
    heading.textContent = recovering ? "Choose a new password" : requestingRecovery ? "Reset your password" : registering ? "Create your account" : "Welcome back";
    description.textContent = recovering ? "Set a new password for your SKILL-UP account." : requestingRecovery ? "We’ll email you a secure link to choose a new password." : registering ? "Register to start learning with SKILL-UP." : "Sign in to continue to your SKILL-UP workspace.";
    submitButton.textContent = recovering ? "Update password" : requestingRecovery ? "Send recovery link" : registering ? "Create account" : "Log in";
    loginTab.classList.toggle("active", !registering);
    registerTab.classList.toggle("active", registering);
    loginTab.setAttribute("aria-selected", String(!registering));
    registerTab.setAttribute("aria-selected", String(registering));
    switchMessage.innerHTML = recovering || requestingRecovery
      ? 'Remembered your password? <button type="button" data-set-mode="login">Return to sign in</button>'
      : registering
      ? 'Already have an account? <button type="button" data-set-mode="login">Log in</button>'
      : 'Forgot your password? <button type="button" data-set-mode="reset">Reset it</button> · New to SKILL-UP? <button type="button" data-set-mode="register">Create an account</button>';
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

  let activeMfaChallenge = null;
  async function beginMfaChallenge() {
    const mfa = client.auth.mfa;
    if (!mfa?.getAuthenticatorAssuranceLevel || !mfa.listFactors || !mfa.challenge || !mfa.verify) {
      throw new Error("Two-factor verification is not available in the current account service.");
    }
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw sessionError;
    if (!sessionData.session) {
      window.location.replace("auth.html?mode=login&error=" + encodeURIComponent("Your sign-in session expired. Sign in again."));
      return;
    }
    const { data: assurance, error: assuranceError } = await mfa.getAuthenticatorAssuranceLevel();
    if (assuranceError) throw assuranceError;
    if (assurance.currentLevel === "aal2") {
      await routeSession(sessionData.session.user);
      return;
    }
    const { data: factors, error: factorsError } = await mfa.listFactors();
    if (factorsError) throw factorsError;
    const factor = (factors.totp || []).find((item) => item.status === "verified");
    if (!factor) throw new Error("No verified authenticator is available for this account. Contact support.");
    const { data: challenge, error: challengeError } = await mfa.challenge({ factorId: factor.id });
    if (challengeError) throw challengeError;
    activeMfaChallenge = { factorId: factor.id, challengeId: challenge.id };
    mfaCode.focus();
  }

  mfaChallenge.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!mfaChallenge.reportValidity() || !activeMfaChallenge) return;
    const submit = mfaChallenge.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      const { error } = await client.auth.mfa.verify({
        ...activeMfaChallenge,
        code: mfaCode.value.trim()
      });
      if (error) throw error;
      const { data, error: sessionError } = await client.auth.getSession();
      if (sessionError) throw sessionError;
      if (!data.session?.user) throw new Error("The verified sign-in session could not be loaded.");
      await routeSession(data.session.user);
    } catch (error) {
      showMessage(`Could not verify your authenticator code: ${window.skillUpSupabase.formatAuthenticatorError(error)}`, true);
      submit.disabled = false;
      mfaCode.focus();
    }
  });
  mfaCancel.addEventListener("click", async () => {
    mfaCancel.disabled = true;
    try {
      const { error } = await client.auth.signOut({ scope: "local" });
      if (error) throw error;
      window.location.replace("auth.html?mode=login");
    } catch (error) {
      showMessage(`Could not end the sign-in session: ${error.message}`, true);
      mfaCancel.disabled = false;
    }
  });

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
    setSubmitLoading(true);
    try {
      if (mode === "reset") {
        const redirectTo = new URL("auth.html?mode=recovery", window.location.href).href;
        const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
        if (error) throw error;
        showMessage("If an account exists for that email, a secure password reset link will be sent.");
        return;
      }

      if (mode === "register" || mode === "recovery") {
        if (mode === "recovery") {
          if (password.length < 8 || password !== confirmInput.value) {
            showMessage(password !== confirmInput.value ? "The passwords do not match." : "Use at least eight characters for your password.", true);
            confirmInput.focus();
            return;
          }
          const { data, error } = await client.auth.updateUser({ password });
          if (error) throw error;
          if (!data.user) throw new Error("The updated account could not be loaded.");
          await routeSession(data.user);
          return;
        }
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
          options: {
            data: {
              full_name: name,
              ...(/^[A-Z0-9-]{4,64}$/.test(referralCode) ? { referral_code: referralCode } : {})
            }
          }
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
    } finally {
      setSubmitLoading(false);
    }
  });

  if (mode === "mfa") {
    document.querySelector("#auth-tabs").hidden = true;
    switchMessage.hidden = true;
    form.hidden = true;
    mfaChallenge.hidden = false;
    heading.textContent = "Verify your identity";
    description.textContent = "Complete two-factor authentication to continue.";
    beginMfaChallenge().catch((error) => showMessage(error.message || "Could not start two-factor verification.", true));
  } else {
    setMode(mode);
  }
  const queryError = new URLSearchParams(location.search).get("error");
  if (queryError) showMessage(queryError, true);
})();
