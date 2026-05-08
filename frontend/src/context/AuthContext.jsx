import { createContext, useContext, useState, useEffect } from "react";
import { api, publicApi } from "../API/axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /* ===== INITIAL AUTH CHECK ===== */
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("jwt_token");

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.get("/profile/me");
        setUser(res.data);
      } catch (err) {
        localStorage.removeItem("jwt_token");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  /* ===== LOGIN ===== */
  const login = async (email, password) => {
    const res = await publicApi.post("/login", { email, password });

    console.log("Login response:", res.data);

    // Handle different response formats
    let token = res.data?.token || res.data?.accessToken || res.data;

    // If token is an object, it might be the user object itself
    if (typeof token === "object" && token !== null) {
      token = token?.token || token?.accessToken;
    }

    if (!token || typeof token !== "string") {
      console.error("Invalid token response:", res.data);
      throw new Error(
        `Invalid token response: expected string, got ${typeof token}. Response: ${JSON.stringify(res.data)}`
      );
    }

    localStorage.setItem("jwt_token", token);

    const profile = await api.get("/profile/me");
    setUser(profile.data);

    return profile.data;
  };

  /* ===== REGISTER ===== */
  const register = async (username, email, password) => {
    // First, create the account
    const registerRes = await publicApi.post("/register", {
      Name: username,
      email: email,
      Password: password
    });

    console.log("Register response:", registerRes.data);

    // Registration returns user object, now login to get token
    try {
      const loginRes = await login(email, password);
      return loginRes;
    } catch (loginErr) {
      console.error("Login after registration failed:", loginErr);
      // If login fails after registration, just set the user from registration response
      setUser(registerRes.data);
      throw new Error(
        "Registration successful but automatic login failed. Please try logging in manually."
      );
    }
  };

  /* ===== LOGOUT ===== */
  const logout = async () => {
    try {
      await api.post("/logout");
    } catch (_) {}

    localStorage.removeItem("jwt_token");
    setUser(null);
  };

  return (
      <AuthContext.Provider
          value={{
            user,
            login,
            register,
            logout,
            loading,
            isAuthenticated: !!user,
          }}
      >
        {!loading && children}
      </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);