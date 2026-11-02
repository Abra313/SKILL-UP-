const ADMIN_CREDENTIAL_KEY = "skillup-local-admin-credential-v1";
const setupForm = document.querySelector("#admin-setup-form");
const toast = document.querySelector("#admin-auth-toast");
let toastTimer;

function showMessage(message, isError = false) {
  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { toast.hidden = true; }, 7000);
}

function bytesToHex(bytes) {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function passwordDigest(password, salt) {
  if (!crypto.subtle) throw new Error("Password hashing is unavailable in this browser. Open this site through localhost or HTTPS.");
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const result = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: encoder.encode(salt), iterations: 120000, hash: "SHA-256" }, key, 256);
  return bytesToHex(result);
}

document.querySelectorAll("[data-toggle-password]").forEach((button) => {
  button.addEventListener("click", () => {
    const input = document.getElementById(button.dataset.togglePassword);
    input.type = input.type === "password" ? "text" : "password";
    button.textContent = input.type === "password" ? "Show" : "Hide";
  });
});

setupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = document.querySelector("#admin-setup-email").value.trim().toLowerCase();
  const password = document.querySelector("#admin-setup-password").value;
  const confirmation = document.querySelector("#admin-setup-confirm").value;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showMessage("Enter a valid administrator email address.", true);
    return;
  }
  if (password.length < 8) {
    showMessage("Use a password with at least 8 characters.", true);
    return;
  }
  if (password !== confirmation) {
    showMessage("The passwords do not match.", true);
    return;
  }
  try {
    if (localStorage.getItem(ADMIN_CREDENTIAL_KEY)) {
      showMessage("Admin access is already set up. Continue to the shared login page.", true);
      return;
    }
    const salt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
    localStorage.setItem(ADMIN_CREDENTIAL_KEY, JSON.stringify({ email, salt, passwordHash: await passwordDigest(password, salt) }));
    const loginURL = new URL("auth.html", window.location.href);
    loginURL.searchParams.set("mode", "login");
    loginURL.searchParams.set("admin", "1");
    loginURL.searchParams.set("email", email);
    window.location.assign(loginURL.href);
  } catch (error) {
    showMessage(error.message || "Could not save local administrator setup.", true);
  }
});

try {
  if (localStorage.getItem(ADMIN_CREDENTIAL_KEY)) {
    window.location.replace("auth.html?mode=login&admin=1");
  }
} catch (error) {
  showMessage(error.message || "Could not read local administrator setup.", true);
}
