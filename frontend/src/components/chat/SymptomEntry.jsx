import { useState } from "react";
import { FaStethoscope, FaArrowRight } from "react-icons/fa";

const HINTS = ["Headache", "Fever & chills", "Chest pain", "Stomach ache", "Back pain"];

export default function SymptomEntry({ onStart, loading, error, isDark, cardClass }) {
    const [symptom, setSymptom] = useState("");

    const handleKey = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onStart(symptom);
        }
    };

    return (
        <div className="fade-in flex flex-1 flex-col items-center justify-center gap-6 py-4">
            {/* Icon + heading */}
            <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-400 shadow-lg shadow-cyan-500/30">
                    <FaStethoscope size={28} className="text-white" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    What brings you in today?
                </h2>
                <p className={`max-w-md text-sm leading-relaxed ${isDark ? "text-zinc-400" : "text-slate-500"}`}>
                    Describe your symptom. I'll ask a few focused questions — one at a time — before giving you personalised guidance.
                </p>
            </div>

            {/* Input card */}
            <div className={`w-full max-w-xl rounded-3xl p-6 ${cardClass}`}>
                <label className={`mb-2 block text-xs font-semibold uppercase tracking-widest ${isDark ? "text-zinc-500" : "text-slate-400"}`}>
                    Symptom or concern
                </label>
                <textarea
                    rows={3}
                    placeholder="e.g. I have a throbbing headache since last night…"
                    value={symptom}
                    onChange={(e) => setSymptom(e.target.value)}
                    onKeyDown={handleKey}
                    disabled={loading}
                    className={`w-full resize-none rounded-2xl border px-4 py-3 text-sm leading-relaxed outline-none transition focus:ring-2 focus:ring-cyan-500 ${isDark
                        ? "border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-600"
                        : "border-slate-200 bg-white text-slate-800 placeholder:text-slate-400"
                        }`}
                />

                {error && (
                    <p className="mt-3 rounded-xl bg-red-500/10 px-4 py-2 text-sm text-red-500">{error}</p>
                )}

                <button
                    onClick={() => onStart(symptom)}
                    disabled={!symptom.trim() || loading}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-600 to-teal-500 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
                >
                    {loading ? (
                        <span className="flex items-center gap-2">
                            <span className="loading-dot" /> Connecting to doctor…
                        </span>
                    ) : (
                        <>
                            Start Consultation <FaArrowRight size={12} />
                        </>
                    )}
                </button>
            </div>

            {/* Hint chips */}
            <div className="flex flex-wrap justify-center gap-2">
                {HINTS.map((hint) => (
                    <button
                        key={hint}
                        onClick={() => setSymptom(hint)}
                        disabled={loading}
                        className={`rounded-2xl border px-4 py-1.5 text-xs font-medium transition hover:border-cyan-500 hover:text-cyan-600 ${isDark ? "border-zinc-700 bg-zinc-900 text-zinc-400" : "border-slate-200 bg-white text-slate-600"
                            }`}
                    >
                        {hint}
                    </button>
                ))}
            </div>
        </div>
    );
}
