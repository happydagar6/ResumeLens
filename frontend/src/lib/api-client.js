import { API_URL } from "./constants";

export async function apiClient(endpoint, options = {}) {
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
  delete: (endpoint) => apiClient(endpoint, { method: "DELETE" }),
  upload: (endpoint, formData) =>
    apiClient(endpoint, { method: "POST", body: formData }),
};
