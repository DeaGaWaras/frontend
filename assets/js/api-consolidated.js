// ======================================================
// api-consolidated.js — Unified API Layer
// ======================================================

const API_BASE = "https://backend-eta-ashen-11.vercel.app/api/";

/**
 * Wrapper universal untuk request API.
 * Mendukung JSON dan FormData secara otomatis.
 */
async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem("token");

  const baseHeaders = {};
  if (token) {
    baseHeaders.Authorization = `Bearer ${token}`;
  }

  const config = { ...options };

  if (options.body) {
    if (options.body instanceof FormData) {
      config.body = options.body;
    } else {
      baseHeaders["Content-Type"] = "application/json";
      config.body = JSON.stringify(options.body);
    }
  }

  config.headers = { ...baseHeaders, ...options.headers };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, config);

    if (res.status === 204) {
      return {};
    }

    const data = await res.json().catch(() => {
      return { message: "Respons server bukan JSON yang valid." };
    });

    if (!res.ok) {
      throw new Error(
        data.message || `Request gagal dengan status ${res.status}`
      );
    }

    return data;
  } catch (err) {
    console.error("Kesalahan API:", err.message);
    throw err;
  }
}

// ================= AUTH =================
export async function loginUser(email, password) {
  const data = await apiRequest("/auth/login", {
    method: "POST",
    body: { email, password },
  });

  // Save token and user info to localStorage
  if (data.token) {
    localStorage.setItem("token", data.token);
    if (data.user) {
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("userId", data.user.id);
    }
  }

  return data;
}

export async function registerUser(data) {
  const response = await apiRequest("/auth/register", {
    method: "POST",
    body: data,
  });

  // If server returns token on registration (auto-login), save it
  if (response.token) {
    localStorage.setItem("token", response.token);
    if (response.user) {
      localStorage.setItem("user", JSON.stringify(response.user));
      localStorage.setItem("userId", response.user.id);
    }
  }

  return response;
}

export async function getProfile() {
  return apiRequest("/auth/profile");
}

export async function updateProfile(data) {
  return apiRequest("/auth/profile/update", {
    method: "PUT",
    body: data,
  });
}

// ================= absensi =================
export async function getabsensiList() {
  return apiRequest("/absensi");
}

export async function getMyabsensi() {
  return apiRequest("/absensi/my");
}

export async function createabsensi(data) {
  return apiRequest("/absensi", {
    method: "POST",
    body: data,
  });
}

export async function updateabsensiStatus(id, status) {
  return apiRequest(`/absensi/${id}/status`, {
    method: "PUT",
    body: { status },
  });
}

export async function deleteabsensi(id) {
  return apiRequest(`/absensi/${id}`, {
    method: "DELETE",
  });
}

// Get aggregated haid data per-student (optimized for guru dashboard)
export async function getHaidAggregate(month, classId) {
  let query = "/absensi/haid/aggregate?";
  const params = [];
  if (month) params.push(`month=${encodeURIComponent(month)}`);
  if (classId) params.push(`classId=${encodeURIComponent(classId)}`);
  query += params.join("&");
  return apiRequest(query);
}

// ================= GURU =================
export async function getGuruList() {
  return apiRequest("/guru");
}

export async function getGuruStats() {
  return apiRequest("/guru/stats");
}

// ================= DASHBOARD/STATS =================
export async function getDashboardStats() {
  return apiRequest("/dashboard/stats");
}

export async function getChartData(filter = "monthly") {
  return apiRequest(`/dashboard/chart?filter=${filter}`);
}

export async function exportPDF() {
  const token = localStorage.getItem("token");
  return fetch(`${API_BASE}/dashboard/export/pdf`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export async function exportExcel() {
  const token = localStorage.getItem("token");
  return fetch(`${API_BASE}/dashboard/export/excel`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

// ================= REPORTS =================
export async function getDailyReport() {
  return apiRequest("/report/daily");
}

export async function getWeeklyReport() {
  return apiRequest("/report/weekly");
}

export async function getPerClassReport() {
  return apiRequest("/report/per-class");
}
