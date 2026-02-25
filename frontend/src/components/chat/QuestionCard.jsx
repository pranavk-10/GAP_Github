import { FaUserMd, FaCheck, FaPaperPlane } from "react-icons/fa";

export default function QuestionCard({
    question,
    questionNumber,
    totalQuestions,
    answeredQA,
    answer,
    setAnswer,
    onSubmit,
    loading,
    error,
    isDark,
    cardClass,
    symptomSummary,
}) {
    const handleKey = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSubmit();
        }
    };

    const isLastQuestion = questionNumber === totalQuestions;

    return (
        <div className="fade-in flex flex-1 flex-col gap-5">
            {/* Symptom summary chip */}
            <div className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium ${isDark ? "bg-zinc-900 text-zinc-400 border border-zinc-800" : "bg-cyan-50 text-cyan-700 border border-cyan-100"}`}>
                <span className={`h-2 w-2 rounded-full bg-cyan-500`} />
                Chief complaint: <span className="font-semibold">{symptomSummary}</span>
            </div>

            {/* Previous answered Q&As */}
            {answeredQA.length > 0 && (
                <div className={`rounded-2xl border p-4 ${isDark ? "border-zinc-800 bg-zinc-900/60" : "border-slate-100 bg-slate-50"}`}>
                    <p className={`mb-3 text-xs font-semibold uppercase tracking-widest ${isDark ? "text-zinc-500" : "text-slate-400"}`}>
                        Answered
                    </p>
                    <div className="flex flex-col gap-3">
                        {answeredQA.map((qa, i) => (
                            <div key={i} className="answered-item flex items-start gap-3">
                                <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-500/20`}>
                                    <FaCheck size={9} className="text-teal-500" />
                                </div>
                                <div>
                                    <p className={`text-xs font-semibold ${isDark ? "text-zinc-300" : "text-slate-700"}`}>
                                        {qa.question}
                                    </p>
                                    <p className={`mt-0.5 text-xs ${isDark ? "text-zinc-500" : "text-slate-500"}`}>
                                        {qa.answer}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Current question card */}
            <div className={`rounded-3xl p-6 ${cardClass}`}>
                <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-teal-400 shadow-md shadow-cyan-500/30">
                        <FaUserMd size={16} className="text-white" />
                    </div>
                    <div>
                        <p className={`text-xs font-semibold uppercase tracking-widest ${isDark ? "text-zinc-500" : "text-slate-400"}`}>
                            Dr. BEAST {isLastQuestion && "· Last question"}
                        </p>
                    </div>
                </div>

                <p className={`text-lg font-semibold leading-snug ${isDark ? "text-zinc-100" : "text-slate-800"}`}>
                    {question || "…"}
                </p>

                {/* Answer input */}
                <div className="mt-5">
                    <textarea
                        rows={2}
                        placeholder="Type your answer here…"
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        onKeyDown={handleKey}
                        disabled={loading}
                        autoFocus
                        className={`w-full resize-none rounded-2xl border px-4 py-3 text-sm leading-relaxed outline-none transition focus:ring-2 focus:ring-cyan-500 ${isDark
                                ? "border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-600"
                                : "border-slate-200 bg-white text-slate-800 placeholder:text-slate-400"
                            }`}
                    />

                    {error && (
                        <p className="mt-2 rounded-xl bg-red-500/10 px-4 py-2 text-sm text-red-500">{error}</p>
                    )}

                    <button
                        onClick={onSubmit}
                        disabled={!answer.trim() || loading}
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-600 to-teal-500 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <span className="loading-dot" /> Processing…
                            </span>
                        ) : (
                            <>
                                {isLastQuestion ? "Get Assessment" : "Next Question"}
                                <FaPaperPlane size={12} />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
