// src/lib/api-client.js
//
// Central API client. All hooks (use-jobs, use-auth, etc.) use this.
// Handles silent token refresh: when a 401 occurs, attempts to get a new
// accessToken via the refreshToken cookie, then retries the original request.

import { API_URL } from "./constants";

// ── Refresh state ─────────────────────────────────────────────────────────────────
// If multiple requests fail with 401 at the same time, we only want ONE refresh
// call, not five. These variables coordinate that.

let isRefreshing = false;
let refreshPromise = null;

async function refreshAccessToken() {
  if (isRefreshing) return refreshPromise;

  isRefreshing = true;
  refreshPromise = fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  })
    .then(async (res) => {
      if (!res.ok) throw new Error("Refresh failed");
      return true;
    })
    .finally(() => {
      isRefreshing = false;
      refreshPromise = null;
    });

  return refreshPromise;
}

// ── Main API function ─────────────────────────────────────────────────────────────
export async function apiClient(endpoint, options = {}, _isRetry = false) {
  const { body, method = "GET", headers = {}, ...rest } = options;

  const config = {
    method,
    credentials: "include",
    headers: {
      ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...headers,
    },
    ...(body ? { body: body instanceof FormData ? body : JSON.stringify(body) } : {}),
    ...rest,
  };

  const res = await fetch(`${API_URL}${endpoint}`, config);

  // ── 401 handling: try silent refresh ──────────────────────────────────────
  if (res.status === 401 && !_isRetry) {
    try {
      await refreshAccessToken();
      return apiClient(endpoint, options, true);
    } catch {
      const data = await res.json().catch(() => ({}));
      const error = new Error(data.message || "Session expired — please log in again");
      error.status = 401;
      throw error;
    }
  }

  const data = await res.json();

  if (!res.ok) {
    const error = new Error(data.message || "Something went wrong");
    error.status = res.status;
    throw error;
  }

  return data;
}

// Convenience methods
export const api = {
  get: (endpoint) => apiClient(endpoint),
  post: (endpoint, body) => apiClient(endpoint, { method: "POST", body }),
  put: (endpoint, body) => apiClient(endpoint, { method: "PUT", body }),
  patch: (endpoint, body) => apiClient(endpoint, { method: "PATCH", body }),
  delete: (endpoint) => apiClient(endpoint, { method: "DELETE" }),
  upload: (endpoint, formData) =>
    apiClient(endpoint, { method: "POST", body: formData }),
};
