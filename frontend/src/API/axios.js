import axios from "axios";

// Public API (for auth endpoints like login/register - no token)
export const publicApi = axios.create({
    baseURL: "http://localhost:8080/api",
    headers: {
        "Content-Type": "application/json",
    },
});

// Protected API (with auth interceptor)
export const api = axios.create({
    baseURL: "http://localhost:8080/api",
    headers: {
        "Content-Type": "application/json",
    },
});

/* ===== REQUEST INTERCEPTOR ===== */
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("jwt_token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

/* ===== RESPONSE INTERCEPTOR ===== */
let isRedirecting = false;

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;

        if (status === 401) {
            localStorage.removeItem("jwt_token");

            // Prevent multiple redirects
            if (!isRedirecting) {
                isRedirecting = true;

                // Use SPA-safe redirect
                setTimeout(() => {
                    window.history.replaceState(null, "", "/auth");
                    window.dispatchEvent(new Event("popstate"));
                    isRedirecting = false;
                }, 0);
            }
        }

        return Promise.reject(error);
    }
);