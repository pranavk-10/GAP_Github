export default function Sidebar({ sessions, activeSession, setActiveSessionId, isDark, cardClass }) {
  return (
    <aside className={`hidden rounded-2xl p-4 lg:block ${cardClass}`}>
      <h2 className="text-sm font-semibold mb-4">Chat History</h2>
      <div className="space-y-3 overflow-y-auto pr-1" style={{ maxHeight: "calc(100vh - 220px)" }}>
        {sessions.map((s) => {
          const isActive = s.id === activeSession?.id;
          return (
            <button
              key={s.id}
              onClick={() => setActiveSessionId(s.id)}
              className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition-all ${
                isActive
                  ? "border-cyan-200 bg-cyan-100 text-cyan-800 shadow-sm"
                  : isDark 
                    ? "border-zinc-800 bg-zinc-900 text-zinc-400" 
                    : "border-slate-100 bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              <p className="truncate font-medium">{s.title || "New chat"}</p>
            </button>
          );
        })}
      </div>
    </aside>
  );
}