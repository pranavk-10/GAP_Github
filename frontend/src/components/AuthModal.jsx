import { useState } from "react";
import { FaTimes, FaLock, FaEnvelope } from "react-icons/fa";
import { API_BASE } from "../constants/config";
import axios from "axios";

export default function AuthModal({ onClose, onSuccess, isDark }) {
  const [tab, setTab] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const overlayClass = "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm";
  const cardClass = isDark
    ? "relative w-full max-w-sm rounded-3xl border border-zinc-700 bg-zinc-900 p-7 shadow-2xl"
    : "relative w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-7 shadow-2xl";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError("");
    try {
      const endpoint = tab === "login" ? "/auth/login" : "/auth/register";
      const { data } = await axios.post(`${API_BASE}${endpoint}`, { email, password });
      onSuccess(data.token, data.user);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.detail || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={overlayClass} onClick={onClose}>
      <div className={cardClass} onClick={(e) => e.stopPropagation()}>
        {/* Close */}
        <button
          onClick={onClose}
          className={`absolute right-4 top-4 rounded-full p-1.5 transition hover:opacity-70 ${isDark ? "text-zinc-400" : "text-slate-400"}`}
        >
          <FaTimes size={14} />
        </button>

        {/* Tabs */}
        <div className={`mb-6 flex rounded-xl p-1 ${isDark ? "bg-zinc-800" : "bg-slate-100"}`}>
          {["login", "register"].map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(""); }}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold capitalize transition ${
                tab === t
                  ? "bg-cyan-600 text-white shadow"
                  : isDark ? "text-zinc-400" : "text-slate-500"
              }`}
            >
              {t === "login" ? "Log In" : "Sign Up"}
            </button>
          ))}
        </div>

        <p className={`mb-5 text-center text-xs ${isDark ? "text-zinc-500" : "text-slate-400"}`}>
          {tab === "login"
            ? "Welcome back! Log in to view your session history."
            : "Create an account to save your consultation history."}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* Email */}
          <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${isDark ? "border-zinc-700 bg-zinc-800" : "border-slate-200 bg-slate-50"}`}>
            <FaEnvelope size={13} className={isDark ? "text-zinc-500" : "text-slate-400"} />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
          </div>

          {/* Password */}
          <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${isDark ? "border-zinc-700 bg-zinc-800" : "border-slate-200 bg-slate-50"}`}>
            <FaLock size={13} className={isDark ? "text-zinc-500" : "text-slate-400"} />
            <input
              type="password"
              placeholder="Password (min 6 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-red-500/10 px-4 py-2 text-xs text-red-500">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 rounded-2xl bg-gradient-to-r from-cyan-600 to-teal-500 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Please wait…" : tab === "login" ? "Log In" : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
