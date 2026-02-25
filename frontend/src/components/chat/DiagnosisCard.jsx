import { FaClipboardList, FaListUl, FaExclamationTriangle, FaInfoCircle, FaRedo } from "react-icons/fa";

export default function DiagnosisCard({ diagnosis, answeredQA, symptomSummary, onReset, isDark, cardClass }) {
    if (!diagnosis) return null;
    const { assessment, advice = [], red_flags = [], disclaimer } = diagnosis;

    return (
        <div className="fade-in flex flex-1 flex-col gap-5 pb-8">
            {/* ── Badge ── */}
            <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/15 px-4 py-1.5 text-xs font-semibold text-teal-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-teal-500" /> Consultation complete
                </span>
            </div>

            {/* ── Summary of conversation ── */}
            {answeredQA.length > 0 && (
                <div className={`rounded-2xl border p-4 ${isDark ? "border-zinc-800 bg-zinc-900/60" : "border-slate-100 bg-slate-50"}`}>
                    <p className={`mb-3 text-xs font-semibold uppercase tracking-widest ${isDark ? "text-zinc-500" : "text-slate-400"}`}>
                        Your session summary
                    </p>
                    <p className={`mb-2 text-xs ${isDark ? "text-zinc-400" : "text-slate-600"}`}>
                        <span className="font-semibold">Chief complaint:</span> {symptomSummary}
                    </p>
                    {answeredQA.map((qa, i) => (
                        <div key={i} className={`mt-2 text-xs ${isDark ? "text-zinc-500" : "text-slate-500"}`}>
                            <span className="font-semibold">Q{i + 1}:</span> {qa.question} — <span className="italic">{qa.answer}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Assessment ── */}
            <div className={`rounded-3xl p-6 ${cardClass}`}>
                <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/15">
                        <FaClipboardList size={14} className="text-cyan-500" />
                    </div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-500">Assessment</h3>
                </div>
                <p className={`text-sm leading-relaxed ${isDark ? "text-zinc-200" : "text-slate-700"}`}>
                    {assessment}
                </p>
            </div>

            {/* ── Advice ── */}
            {advice.length > 0 && (
                <div className={`rounded-3xl p-6 ${cardClass}`}>
                    <div className="mb-3 flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500/15">
                            <FaListUl size={14} className="text-teal-500" />
                        </div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-teal-500">What to do now</h3>
                    </div>
                    <ul className="flex flex-col gap-2">
                        {advice.map((item, i) => (
                            <li key={i} className={`flex items-start gap-3 text-sm ${isDark ? "text-zinc-300" : "text-slate-700"}`}>
                                <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-500/15 text-[10px] font-bold text-teal-500">
                                    {i + 1}
                                </span>
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* ── Red flags ── */}
            {red_flags.length > 0 && (
                <div className={`rounded-3xl border p-6 ${isDark ? "border-red-900/50 bg-red-950/30" : "border-red-100 bg-red-50"}`}>
                    <div className="mb-3 flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-500/15">
                            <FaExclamationTriangle size={14} className="text-red-500" />
                        </div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-red-500">Seek urgent care if…</h3>
                    </div>
                    <ul className="flex flex-col gap-2">
                        {red_flags.map((flag, i) => (
                            <li key={i} className={`flex items-start gap-2 text-sm ${isDark ? "text-red-300" : "text-red-700"}`}>
                                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                                {flag}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* ── Disclaimer ── */}
            {disclaimer && (
                <div className={`flex items-start gap-3 rounded-2xl p-4 text-xs ${isDark ? "bg-zinc-900 text-zinc-500" : "bg-slate-50 text-slate-500"}`}>
                    <FaInfoCircle size={12} className="mt-0.5 shrink-0 text-slate-400" />
                    <p>{disclaimer}</p>
                </div>
            )}

            {/* ── New consultation button ── */}
            <button
                onClick={onReset}
                className={`flex items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-semibold transition hover:border-cyan-500 hover:text-cyan-500 ${isDark ? "border-zinc-700 text-zinc-400" : "border-slate-200 text-slate-600"
                    }`}
            >
                <FaRedo size={12} /> Start New Consultation
            </button>
        </div>
    );
}
