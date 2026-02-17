"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authAPI } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Check if user is logged in on mount
    const checkAuth = useCallback(async () => {
        try {
            const data = await authAPI.me();
            setUser(data.data.user);
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    const login = async (email, password) => {
        const data = await authAPI.login({ email, password });
        setUser(data.data.user);
        return data;
    };

    const signup = async (name, email, password, company) => {
        const data = await authAPI.signup({ name, email, password, company });
        setUser(data.data.user);
        return data;
    };

    const logout = async () => {
        await authAPI.logout();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
