import { FaArrowLeft, FaMoon, FaSun, FaPlus, FaUser, FaSignOutAlt, FaSignInAlt } from "react-icons/fa";

export default function Header({ isDark, setTheme, startNewChat, onBack, cardClass, user, isLoggedIn, onLoginClick, onLogout }) {
  return (
    <header className={`rounded-2xl p-4 ${cardClass}`}>
      <div className="flex items-center justify-between">
        {/* Left: Back + Brand */}
        <div className="flex items-center gap-4">
          {onBack && (
            <button onClick={onBack} className={isDark ? "text-slate-200" : "text-slate-700"}>
              <FaArrowLeft size={18} />
            </button>
          )}
          <h1 className="text-xl font-semibold tracking-wide">ASHA</h1>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {startNewChat && (
            <button
              onClick={startNewChat}
              className="flex flex-col items-center gap-1 transition hover:opacity-70"
            >
              <FaPlus size={16} className={isDark ? "text-slate-100" : "text-slate-900"} />
              <span className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>New</span>
            </button>
          )}

          {/* Auth section */}
          {isLoggedIn ? (
            <div className="flex items-center gap-2">
              <span className={`hidden rounded-full px-3 py-1.5 text-xs font-semibold sm:inline-flex items-center gap-1.5 ${isDark ? "bg-zinc-800 text-zinc-300" : "bg-slate-100 text-slate-600"}`}>
                <FaUser size={9} /> {user?.email?.split("@")[0]}
              </span>
              <button
                onClick={onLogout}
                title="Log out"
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:border-red-400 hover:text-red-500 ${isDark ? "border-zinc-700 text-zinc-400" : "border-slate-200 text-slate-500"}`}
              >
                <FaSignOutAlt size={10} /> Logout
              </button>
            </div>
          ) : (
            <button
              onClick={onLoginClick}
              className="flex items-center gap-1.5 rounded-full bg-cyan-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-cyan-700"
            >
              <FaSignInAlt size={10} /> Login
            </button>
          )}

          {/* Theme toggle */}
          <button onClick={() => setTheme(isDark ? "light" : "dark")} className="transition hover:opacity-70">
            {isDark ? <FaSun size={20} className="text-yellow-400" /> : <FaMoon size={20} className="text-slate-900" />}
          </button>
        </div>
      </div>
    </header>
  );
}