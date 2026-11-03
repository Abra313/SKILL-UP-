const authForm = document.querySelector("#auth-form");
const authMessage = document.querySelector("#auth-message");
const modeTabs = [...document.querySelectorAll(".auth-tab")];
const formHeading = document.querySelector("#form-heading");
const formSubheading = document.querySelector("#form-subheading");
const submitLabel = document.querySelector("#submit-label");
const switchCopy = document.querySelector("#auth-switch-copy");
const passwordInput = document.querySelector("#password");
const passwordToggle = document.querySelector(".password-toggle");
const supabaseClient = window.skillUpSupabase;
const query = new URLSearchParams(window.location.search);
let mode = query.get("mode") === "signup" ? "signup" : "login";
let messageTimer;
const courseNames = {
  "full-stack-development": "Full Stack Development",
  "frontend-development": "Frontend Development",
  "ai-automation": "AI Automation",
  "ai-voice-agent": "AI Voice Agent Development",
  "vibe-coding-adsense": "Vibe Coding & Google AdSense",
  "ui-ux-design": "UI/UX Design",
  "graphics-design": "Graphics Design",
  "mobile-app-development": "Mobile App Development",
  "cybersecurity-fundamentals": "Cybersecurity Fundamentals"
};
const selectedCourse = courseNames[query.get("course")];
if (selectedCourse) {
  document.querySelector("#selected-course").textContent = selectedCourse;
  document.querySelector("#course-selection").hidden = false;
}
if (query.get("registered") === "1") {
  showMessage("Your account was created. Log in with your email and password to continue.");
}
if (query.get("admin") === "1") {
  const adminEmail = query.get("email");
  if (adminEmail) document.querySelector("#email").value = adminEmail;
}

function showMessage(message) {
  authMessage.textContent = message;
  authMessage.hidden = false;
  window.clearTimeout(messageTimer);
  messageTimer = window.setTimeout(() => { authMessage.hidden = true; }, 6500);
}

function clearErrors() {
  document.querySelectorAll(".field-error").forEach((item) => { item.textContent = ""; });
  authForm.querySelectorAll("[aria-invalid='true']").forEach((item) => item.removeAttribute("aria-invalid"));
}

function setMode(nextMode) {
  mode = nextMode;
  const isSignup = mode === "signup";
  modeTabs.forEach((tab) => {
    const active = tab.dataset.mode === mode;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
  });
  document.querySelectorAll(".signup-only").forEach((element) => { element.hidden = !isSignup; });
  document.querySelectorAll(".login-only").forEach((element) => { element.hidden = isSignup; });
  document.querySelector("#full-name").required = isSignup;
  document.querySelector("#terms").required = isSignup;
  passwordInput.autocomplete = isSignup ? "new-password" : "current-password";
  formHeading.textContent = isSignup ? "Start something good." : "Welcome back.";
  formSubheading.textContent = isSignup ? "Create your account and take the first step." : "Sign in to pick up where you left off.";
  submitLabel.textContent = isSignup ? "Create account" : "Log in";
  document.querySelector("#forgot-password").hidden = isSignup;
  switchCopy.innerHTML = isSignup
    ? 'Already have an account? <button type="button" data-mode="login">Log in</button>'
    : 'New to SKILL-UP? <button type="button" data-mode="signup">Create your account</button>';
  clearErrors();
}

function setError(input, errorElement, message) {
  input.setAttribute("aria-invalid", "true");
  errorElement.textContent = message;
}

function validateForm() {
  clearErrors();
  let firstInvalid = null;
  const email = document.querySelector("#email");
  const emailValue = email.value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
    setError(email, document.querySelector("#email-error"), "Enter a valid email address.");
    firstInvalid = email;
  }

  if (mode === "signup") {
    const name = document.querySelector("#full-name");
    if (name.value.trim().length < 2) {
      setError(name, document.querySelector("#name-error"), "Enter your name (at least 2 characters).");
      firstInvalid ||= name;
    }
  }

  if (passwordInput.value.length < 8) {
    setError(passwordInput, document.querySelector("#password-error"), "Password must be at least 8 characters.");
    firstInvalid ||= passwordInput;
  }

  if (mode === "signup" && !document.querySelector("#terms").checked) {
    document.querySelector("#terms-error").textContent = "Please agree to the terms to continue.";
    firstInvalid ||= document.querySelector("#terms");
  }
  firstInvalid?.focus();
  return !firstInvalid;
}

async function routeAuthenticatedUser(user) {
  const { data: profile, error } = await supabaseClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw new Error(`Could not load your account role. Run supabase/schema.sql first. ${error.message}`);
  if (!profile) throw new Error("Your Supabase profile is missing. Run supabase/schema.sql and sign in again.");
  if (profile.role === "admin") window.location.assign("admin.html");
  else if (profile.role === "learner") window.location.assign("student.html");
  else throw new Error("Your account has an unsupported role. Ask an administrator to correct your Supabase profile.");
}

function showAuthError(error) {
  showMessage(error?.message || "Supabase could not complete this request.");
}

modeTabs.forEach((tab) => tab.addEventListener("click", () => setMode(tab.dataset.mode)));
document.addEventListener("click", (event) => {
  const switchButton = event.target.closest("[data-mode]");
  if (switchButton && !switchButton.classList.contains("auth-tab")) setMode(switchButton.dataset.mode);
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!validateForm()) return;
  if (!supabaseClient) {
    showMessage("Supabase is not configured. Check supabase-client.js and reload this page.");
    return;
  }
  const email = document.querySelector("#email").value.trim().toLowerCase();
  const submitButton = authForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  try {
    if (mode === "signup") {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password: passwordInput.value,
        options: { data: { full_name: document.querySelector("#full-name").value.trim() } }
      });
      if (error) throw error;
      if (data.session && data.user) await routeAuthenticatedUser(data.user);
      else showMessage("Account created. Check your email to confirm the account, then log in.");
      return;
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: passwordInput.value });
    if (error) throw error;
    await routeAuthenticatedUser(data.user);
  } catch (error) {
    showAuthError(error);
  } finally {
    submitButton.disabled = false;
  }
});

passwordToggle.addEventListener("click", () => {
  const isVisible = passwordInput.type === "text";
  passwordInput.type = isVisible ? "password" : "text";
  passwordToggle.textContent = isVisible ? "Show" : "Hide";
  passwordToggle.setAttribute("aria-label", isVisible ? "Show password" : "Hide password");
  passwordToggle.setAttribute("aria-pressed", String(!isVisible));
  passwordInput.focus();
});

document.querySelector("#forgot-password").addEventListener("click", (event) => {
  event.preventDefault();
  if (!supabaseClient) {
    showMessage("Supabase is not configured. Check supabase-client.js and reload this page.");
    return;
  }
  const email = document.querySelector("#email").value.trim().toLowerCase();
  if (!email) {
    showMessage("Enter your email address first, then choose Forgot password.");
    return;
  }
  supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth.html` })
    .then(({ error }) => error ? showAuthError(error) : showMessage("If the account exists, Supabase has sent a password reset link."));
});

document.querySelector("#google-button").addEventListener("click", () => {
  showMessage("Google sign-in requires an identity provider and is not available in this local prototype.");
});

document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
    const activeTab = document.activeElement.closest?.('[role="tab"]');
    if (activeTab) {
      event.preventDefault();
      const next = activeTab.dataset.mode === "login" ? "signup" : "login";
      setMode(next);
      modeTabs.find((tab) => tab.dataset.mode === next).focus();
    }
  }
});

if (!supabaseClient) showMessage("Supabase is not configured. Check supabase-client.js.");
setMode(mode);
