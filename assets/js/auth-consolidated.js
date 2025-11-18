// ===============================
// auth-consolidated.js
// ===============================

// TOKEN HANDLING
export function isLoggedIn() {
  const token = localStorage.getItem("token");
  return Boolean(token && !isTokenExpired(token));
}

export function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export function getUserRole() {
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.role || null;
  } catch {
    return null;
  }
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("userId");
  localStorage.removeItem("user");
  // Redirect to site root index.html after logout
  window.location.href = "../index.html";
}

// GLOBAL NOTIFICATION
export function notify(message, type = "error") {
  const wrapper = document.getElementById("notify-wrapper");
  if (!wrapper) return alert(message);

  const div = document.createElement("div");

  const color =
    type === "success"
      ? "bg-green-600 border-green-700"
      : type === "info"
      ? "bg-blue-600 border-blue-700"
      : "bg-red-600 border-red-700";

  div.className = `
    px-4 py-3 text-white font-semibold rounded-xl shadow-xl border
    transform transition-all duration-300 opacity-0 translate-x-10
    ${color}
  `;

  div.textContent = message;
  wrapper.appendChild(div);

  setTimeout(() => div.classList.add("notify-show"), 20);

  setTimeout(() => {
    div.classList.remove("notify-show");
    div.classList.add("notify-hide");
    setTimeout(() => div.remove(), 300);
  }, 3000);
}

export function showSuccess(message) {
  notify(message, "success");
}

export function showInfo(message) {
  notify(message, "info");
}

export function showError(message) {
  notify(message, "error");
}

// GUARDS
export function pageGuard(requiredRole = null) {
  if (!isLoggedIn()) {
    window.location.href = "../pages/login.html";
    return;
  }

  if (requiredRole && getUserRole() !== requiredRole) {
    window.location.href = "../pages/home.html";
    return;
  }
}
