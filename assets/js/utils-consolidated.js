// =============================
// utils-consolidated.js
// =============================

// Format tanggal Indonesia
export function formatDate(date) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// Format waktu
export function formatTime(date) {
  if (!date) return "-";
  return new Date(date).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Validasi form
export function validateForm(formData, required = []) {
  for (let key of required) {
    if (!formData[key] || formData[key].toString().trim() === "") {
      return { valid: false, field: key };
    }
  }
  return { valid: true };
}

// Toast container (dibuat sekali)
if (!document.getElementById("toast-container")) {
  const tc = document.createElement("div");
  tc.id = "toast-container";
  tc.style.position = "fixed";
  tc.style.top = "20px";
  tc.style.right = "20px";
  tc.style.zIndex = "9999";
  tc.style.display = "flex";
  tc.style.flexDirection = "column";
  tc.style.gap = "10px";
  document.body.appendChild(tc);
}

export function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = "toast-message";

  toast.style.padding = "12px 16px";
  toast.style.borderRadius = "10px";
  toast.style.color = "white";
  toast.style.fontSize = "14px";
  toast.style.fontWeight = "600";
  toast.style.boxShadow = "0px 2px 8px rgba(0,0,0,0.2)";
  toast.style.opacity = "0";
  toast.style.transition = "all .3s ease";

  toast.style.background =
    type === "error" ? "#ef4444" : type === "warning" ? "#f59e0b" : "#22c55e";

  toast.innerText = message;

  document.getElementById("toast-container").appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  }, 50);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-20px)";
    setTimeout(() => toast.remove(), 300);
  }, 2600);
}

export function showSuccess(message) {
  showToast(message, "success");
}

export function showError(message) {
  showToast(message, "error");
}

export function showWarning(message) {
  showToast(message, "warning");
}

// Load component HTML (simple implementation)
export async function loadComponent(path, selector) {
  try {
    const res = await fetch(path);
    const html = await res.text();
    const el = document.querySelector(selector);
    if (el) el.innerHTML = html;
  } catch (err) {
    console.error(`Failed to load component ${path}:`, err);
  }
}
