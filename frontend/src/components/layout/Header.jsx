import { FaArrowLeft, FaMoon, FaSun, FaPlus } from "react-icons/fa";

export default function Header({ isDark, setTheme, startNewChat, onBack, cardClass }) {
  return (
    <header className={`rounded-2xl p-4 ${cardClass}`}>
      <div className="flex items-center justify-between">
        {/* Left Side: Back & Brand */}
        <div className="flex items-center gap-4">
          {onBack && (
            <button 
              onClick={onBack}
              className={isDark ? "text-slate-200" : "text-slate-700"}
            >
              <FaArrowLeft size={18} />
            </button>
          )}
          <h1 className="text-xl font-semibold tracking-wide">BEAST</h1>
        </div>

        {/* Right Side: Actions */}
        <div className="flex items-center gap-6">
          {startNewChat && (
            <button 
              onClick={startNewChat}
              className="flex flex-col items-center gap-1 transition hover:opacity-70"
            >
              <FaPlus size={16} className={isDark ? "text-slate-100" : "text-slate-900"} />
              <span className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>New</span>
            </button>
          )}

          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="transition hover:opacity-70"
          >
            {isDark ? (
              <FaSun size={20} className="text-yellow-400" />
            ) : (
              <FaMoon size={20} className="text-slate-900" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}