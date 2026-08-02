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
  if (isRefreshing) return refreshPromise; // if access token is refreshing, return the promise

  isRefreshing = true; // set access token as refreshing
  refreshPromise = fetch(`${API_URL}/auth/refresh`, { // refresh access token using refresh token cookie
    method: "POST", // post request
    credentials: "include", // include credentials
  })
    .then(async (res) => {
      if (!res.ok) throw new Error("Refresh failed"); // throw error if refresh failed
      return true;
    })
    .finally(() => {
      isRefreshing = false;
      refreshPromise = null;
    });

  return refreshPromise;
}

// ── Main API function ─────────────────────────────────────────────────────────────
export async function apiClient(endpoint, options = {}, _isRetry = false) { // endpoint: API endpoint, options: API options, _isRetry: whether this is a retry request
  const { body, method = "GET", headers = {}, ...rest } = options; // body: request body, method: HTTP method, headers: request headers, rest: rest of the options

  // 
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
  // Why we created this ?
  // Because when the access token expires, we need to refresh it to get a new access token
  // and then retry the request.
  if (res.status === 401 && !_isRetry) { // if response is 401 and this is not a retry request
    try {
      await refreshAccessToken(); // refresh access token
      return apiClient(endpoint, options, true); // retry the request
    } catch {
      const data = await res.json().catch(() => ({})); // parse response body
      const error = new Error(data.message || "Session expired — please log in again"); // create error
      error.status = 401; // set status to 401
      throw error; // throw error
    }
  }

  const data = await res.json(); // parse response body

  if (!res.ok) { // if response is not ok
    const error = new Error(data.message || "Something went wrong"); // create error
    error.status = res.status; // set status to response status
    throw error; // throw error
  }

  return data; // return response data
}

// Convenience methods
export const api = {
  get: (endpoint) => apiClient(endpoint), // get request
  post: (endpoint, body) => apiClient(endpoint, { method: "POST", body }), // post request
  put: (endpoint, body) => apiClient(endpoint, { method: "PUT", body }), // put request
  patch: (endpoint, body) => apiClient(endpoint, { method: "PATCH", body }), // patch request
  delete: (endpoint) => apiClient(endpoint, { method: "DELETE" }), // delete request
  upload: (endpoint, formData) =>
    apiClient(endpoint, { method: "POST", body: formData }),
};
