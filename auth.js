const authForm = document.querySelector("#auth-form");
const authMessage = document.querySelector("#auth-message");
const modeTabs = [...document.querySelectorAll(".auth-tab")];
const formHeading = document.querySelector("#form-heading");
const formSubheading = document.querySelector("#form-subheading");
const submitLabel = document.querySelector("#submit-label");
const switchCopy = document.querySelector("#auth-switch-copy");
const passwordInput = document.querySelector("#password");
const passwordToggle = document.querySelector(".password-toggle");
const query = new URLSearchParams(window.location.search);
const AUTH_USERS_KEY = "skillup-local-accounts-v1";
const AUTH_SESSION_KEY = "skillup-local-session-v1";
const ADMIN_CREDENTIAL_KEY = "skillup-local-admin-credential-v1";
const ADMIN_SESSION_KEY = "skillup-local-admin-session-v1";
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
  const registeredEmail = query.get("email");
  if (registeredEmail) document.querySelector("#email").value = registeredEmail;
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

function readAccounts() {
  const saved = localStorage.getItem(AUTH_USERS_KEY);
  if (!saved) return [];
  const accounts = JSON.parse(saved);
  if (!Array.isArray(accounts)) throw new Error("Saved account data is invalid.");
  return accounts;
}

function bytesToHex(bytes) {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function passwordDigest(password, salt) {
  if (!window.crypto?.subtle) throw new Error("Secure password hashing is unavailable in this browser. Open the site using localhost or HTTPS.");
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: encoder.encode(salt), iterations: 120000, hash: "SHA-256" }, key, 256);
  return bytesToHex(bits);
}

function localAuthError(error) {
  showMessage(error instanceof DOMException && error.name === "QuotaExceededError"
    ? "Browser storage is full. Free up space and try again."
    : error.message || "Could not access local account storage. Check browser storage permissions and try again.");
}

modeTabs.forEach((tab) => tab.addEventListener("click", () => setMode(tab.dataset.mode)));
document.addEventListener("click", (event) => {
  const switchButton = event.target.closest("[data-mode]");
  if (switchButton && !switchButton.classList.contains("auth-tab")) setMode(switchButton.dataset.mode);
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!validateForm()) return;
  const email = document.querySelector("#email").value.trim().toLowerCase();
  const submitButton = authForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  try {
    const accounts = readAccounts();
    if (mode === "signup") {
      if (accounts.some((account) => account.email === email)) {
        setError(document.querySelector("#email"), document.querySelector("#email-error"), "An account with this email already exists. Log in instead.");
        return;
      }
      const salt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
      const account = {
        id: `local-${crypto.randomUUID()}`,
        name: document.querySelector("#full-name").value.trim(),
        email,
        role: "learner",
        passwordSalt: salt,
        passwordHash: await passwordDigest(passwordInput.value, salt),
        createdAt: new Date().toISOString()
      };
      accounts.push(account);
      localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(accounts));
      localStorage.removeItem(AUTH_SESSION_KEY);
      const loginURL = new URL("auth.html", window.location.href);
      loginURL.searchParams.set("mode", "login");
      loginURL.searchParams.set("registered", "1");
      loginURL.searchParams.set("email", account.email);
      if (query.get("course")) loginURL.searchParams.set("course", query.get("course"));
      window.location.assign(loginURL.href);
      return;
    }

    const savedAdmin = localStorage.getItem(ADMIN_CREDENTIAL_KEY);
    const adminCredential = savedAdmin ? JSON.parse(savedAdmin) : null;
    if (adminCredential?.email === email && adminCredential.salt && adminCredential.passwordHash) {
      if (adminCredential.passwordHash !== await passwordDigest(passwordInput.value, adminCredential.salt)) {
        showMessage("Email or password is incorrect.");
        return;
      }
      localStorage.removeItem(AUTH_SESSION_KEY);
      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ email, role: "admin" }));
      window.location.assign("admin.html");
      return;
    }

    const account = accounts.find((item) => item.email === email);
    if (!account || !account.passwordSalt || !account.passwordHash || account.passwordHash !== await passwordDigest(passwordInput.value, account.passwordSalt)) {
      showMessage("Email, password, or account type is incorrect.");
      return;
    }
    if (account.role === "admin") {
      showMessage("Administrator sign-in is not available from public local accounts.");
      return;
    }
    if (account.role !== "learner") {
      account.role = "learner";
      localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(accounts));
    }
    localStorage.removeItem(ADMIN_SESSION_KEY);
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({ email: account.email, role: "learner", name: account.name }));
    window.location.assign("student.html");
  } catch (error) {
    localAuthError(error);
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
  showMessage("Password reset is unavailable for local accounts. Lost passwords cannot be recovered in this prototype.");
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

setMode(mode);
