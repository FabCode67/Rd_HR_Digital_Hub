"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { API_CONFIG } from "@/lib/config";
import { jwtDecode } from "jwt-decode";
import { Employee } from "@/lib/types";

export interface AuthContextType {
  user: Employee | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<Employee>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Employee | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const apiBaseUrl = `${API_CONFIG.baseURL}${API_CONFIG.apiPrefix}`;

  const fetchCurrentUser = async (accessToken: string): Promise<Employee> => {
    const response = await fetch(`${apiBaseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error("Failed to load current user");
    }

    return response.json();
  };

  // Load token from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("auth_token");
    if (storedToken) {
      try {
        setToken(storedToken);
        void fetchCurrentUser(storedToken)
          .then((currentUser) => setUser(currentUser))
          .catch(() => {
            const decoded: any = jwtDecode(storedToken);
            setUser({
              id: "" as any,
              full_name: decoded.email || "",
              email: decoded.email,
              role: decoded.role,
              status: "ACTIVE",
              created_at: "",
              updated_at: "",
            });
          });
      } catch (e) {
        console.error("Failed to decode token", e);
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Login failed");
      }

      const data = await response.json();
      setToken(data.access_token);
      localStorage.setItem("auth_token", data.access_token);

      const currentUser = await fetchCurrentUser(data.access_token);
      setUser(currentUser);
      localStorage.setItem("user", JSON.stringify(currentUser));
      return currentUser;
    } catch (error: any) {
      setToken(null);
      setUser(null);
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
