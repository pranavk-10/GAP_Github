import { FaCommentMedical, FaCheckCircle, FaSpinner } from "react-icons/fa";

const STAGE_LABELS = {
  idle: { label: "New", color: "text-slate-400", bg: "bg-slate-400/10" },
  questioning: { label: "In progress", color: "text-amber-500", bg: "bg-amber-500/10" },
  final: { label: "Complete", color: "text-teal-500", bg: "bg-teal-500/10" },
};

export default function Sidebar({ sessions, activeSession, setActiveSessionId, isDark, cardClass }) {
  return (
    <aside className={`hidden rounded-2xl p-4 lg:flex lg:flex-col ${cardClass}`}>
      <div className="mb-4 flex items-center gap-2">
        <FaCommentMedical size={14} className={isDark ? "text-cyan-400" : "text-cyan-600"} />
        <h2 className={`text-xs font-bold uppercase tracking-widest ${isDark ? "text-zinc-400" : "text-slate-500"}`}>
          Session History
        </h2>
      </div>

      <div
        className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1"
        style={{ maxHeight: "calc(100vh - 220px)" }}
      >
        {sessions.map((s) => {
          const isActive = s.id === activeSession?.id;
          const stageInfo = STAGE_LABELS[s.stage || "idle"];

          return (
            <button
              key={s.id}
              onClick={() => setActiveSessionId(s.id)}
              className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition-all ${isActive
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

              <div className="mt-1.5 flex items-center justify-between gap-2">
                {/* Stage badge */}
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${stageInfo.bg} ${stageInfo.color}`}>
                  {s.stage === "final" ? (
                    <FaCheckCircle size={8} />
                  ) : s.stage === "questioning" ? (
                    <FaSpinner size={8} className="animate-spin" />
                  ) : null}
                  {stageInfo.label}
                </span>

                {/* Q count */}
                {s.stage === "questioning" && (
                  <span className={`text-[10px] ${isDark ? "text-zinc-600" : "text-slate-400"}`}>
                    Q{s.currentQuestionNumber || 0}/5
                  </span>
                )}

                {/* Created time */}
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