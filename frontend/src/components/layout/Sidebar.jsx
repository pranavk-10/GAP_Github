import { FaCommentMedical, FaCheckCircle, FaSpinner, FaLock } from "react-icons/fa";

const STAGE_LABELS = {
  idle:        { label: "New",         color: "text-slate-400",  bg: "bg-slate-400/10" },
  questioning: { label: "In progress", color: "text-amber-500",  bg: "bg-amber-500/10" },
  final:       { label: "Complete",    color: "text-teal-500",   bg: "bg-teal-500/10"  },
};

export default function Sidebar({ sessions, activeSession, setActiveSessionId, isDark, cardClass, isLoggedIn, onLoginClick }) {
  return (
    <aside className={`hidden rounded-2xl p-4 lg:flex lg:flex-col ${cardClass}`}>
      <div className="mb-4 flex items-center gap-2">
        <FaCommentMedical size={14} className={isDark ? "text-cyan-400" : "text-cyan-600"} />
        <h2 className={`text-xs font-bold uppercase tracking-widest ${isDark ? "text-zinc-400" : "text-slate-500"}`}>
          Session History
        </h2>
      </div>

      {/* Not logged in — show prompt */}
      {!isLoggedIn && (
        <div className={`mb-4 flex flex-col items-center gap-3 rounded-2xl border p-4 text-center ${isDark ? "border-zinc-800 bg-zinc-900/60" : "border-slate-100 bg-slate-50"}`}>
          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${isDark ? "bg-zinc-800" : "bg-slate-100"}`}>
            <FaLock size={14} className={isDark ? "text-zinc-400" : "text-slate-400"} />
          </div>
          <p className={`text-xs leading-relaxed ${isDark ? "text-zinc-500" : "text-slate-500"}`}>
            Log in to save and view your consultation history across devices.
          </p>
          <button
            onClick={onLoginClick}
            className="w-full rounded-xl bg-cyan-600 py-2 text-xs font-semibold text-white transition hover:bg-cyan-700"
          >
            Login / Sign Up
          </button>
        </div>
      )}

      {/* Session list */}
      <div
        className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1"
        style={{ maxHeight: "calc(100vh - 260px)" }}
      >
        {sessions.map((s) => {
          const isActive = s.id === activeSession?.id;
          const stageInfo = STAGE_LABELS[s.stage || "idle"];

          return (
            <button
              key={s.id}
              onClick={() => setActiveSessionId(s.id)}
              className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition-all ${
                isActive
                  ? isDark
                    ? "border-cyan-700 bg-cyan-950/60 text-cyan-200 shadow-sm"
                    : "border-cyan-200 bg-cyan-50 text-cyan-800 shadow-sm"
                  : isDark
                  ? "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                  : "border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50"
              }`}
            >
              <p className="truncate font-semibold leading-tight">
                {s.title || "New consultation"}
              </p>

              <div className="mt-1.5 flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${stageInfo.bg} ${stageInfo.color}`}>
                  {s.stage === "final" ? (
                    <FaCheckCircle size={8} />
                  ) : s.stage === "questioning" ? (
                    <FaSpinner size={8} className="animate-spin" />
                  ) : null}
                  {stageInfo.label}
                </span>

                {s.stage === "questioning" && (
                  <span className={`text-[10px] ${isDark ? "text-zinc-600" : "text-slate-400"}`}>
                    Q{s.currentQuestionNumber || 0}/5
                  </span>
                )}

                <span className={`ml-auto text-[10px] ${isDark ? "text-zinc-700" : "text-slate-300"}`}>
                  {new Date(s.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}