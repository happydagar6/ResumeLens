// src/lib/api.js

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

/**
 * Fetch wrapper with credentials, JSON parsing, and error handling
 */
async function apiFetch(endpoint, options = {}) {
    const url = `${API_URL}${endpoint}`;

    const config = {
        credentials: "include", // Send cookies for JWT
        headers: {
            "Content-Type": "application/json",
            ...options.headers,
        },
        ...options,
    };

    // Don't set Content-Type for FormData (let browser set it with boundary)
    if (options.body instanceof FormData) {
        delete config.headers["Content-Type"];
    }

    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Something went wrong");
    }

    return data;
}

// Auth API
export const authAPI = {
    signup: (body) => apiFetch("/auth/signup", { method: "POST", body: JSON.stringify(body) }),
    login: (body) => apiFetch("/auth/login", { method: "POST", body: JSON.stringify(body) }),
    logout: () => apiFetch("/auth/logout", { method: "POST" }),
    me: () => apiFetch("/auth/me"),
};

// Jobs API
export const jobsAPI = {
    create: (body) => apiFetch("/jobs", { method: "POST", body: JSON.stringify(body) }),
    getAll: () => apiFetch("/jobs"),
    getById: (id) => apiFetch(`/jobs/${id}`),
    update: (id, body) => apiFetch(`/jobs/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    delete: (id) => apiFetch(`/jobs/${id}`, { method: "DELETE" }),
};

// Resumes API
export const resumesAPI = {
    upload: (formData) => apiFetch("/resumes/upload", { method: "POST", body: formData }),
    getByJob: (jobId) => apiFetch(`/resumes/job/${jobId}`),
    getById: (id) => apiFetch(`/resumes/${id}`),
    delete: (id) => apiFetch(`/resumes/${id}`, { method: "DELETE" }),
};

// Screening API
export const screeningAPI = {
    screen: (body) => apiFetch("/screening", { method: "POST", body: JSON.stringify(body) }),
    getByJob: (jobId) => apiFetch(`/screening/job/${jobId}`),
    getById: (id) => apiFetch(`/screening/${id}`),
};

// Questions API
export const questionsAPI = {
    generate: (body) => apiFetch("/questions/generate", { method: "POST", body: JSON.stringify(body) }),
    getByScreening: (screeningId) => apiFetch(`/questions/screening/${screeningId}`),
};
