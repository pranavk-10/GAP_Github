/**
 * useAuth.js – stores JWT token + user info in localStorage.
 * Simple: login(), logout(), isLoggedIn, user, token.
 */
import { useState } from "react";

const TOKEN_KEY = "beast_token";
const USER_KEY = "beast_user";

export default function useAuth() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || null);
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const login = (newToken, newUser) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  };

  return {
    token,
    user,
    isLoggedIn: !!token,
    login,
    logout,
  };
}
