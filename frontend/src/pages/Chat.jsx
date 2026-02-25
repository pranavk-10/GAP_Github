import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import useTheme from "../hooks/useTheme";
import useSessions from "../hooks/useSessions";
import { sendChatRequest } from "../services/chatServics";
import { normalizeError } from "../utils/errorUtils";
import Header from "../components/layout/Header";
import Sidebar from "../components/layout/Sidebar";
import SymptomEntry from "../components/chat/SymptomEntry";
import QuestionCard from "../components/chat/QuestionCard";
import DiagnosisCard from "../components/chat/DiagnosisCard";

const MAX_QUESTIONS = 5;

export default function Chat() {
  const { setTheme, isDark } = useTheme();
  const navigate = useNavigate();

  const {
    sessions,
    activeSession,
    setActiveSessionId,
    updateActiveSession,
    startNewChat,
  } = useSessions();

  // Local UI state (not persisted per session — transient only)
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Helpers to read consultation state from activeSession
  const s = activeSession || {};
  const stage = s.stage || "idle";
  const symptom = s.symptom || "";
  const history = s.history || [];
  const questionCount = s.questionCount || 0;
  const currentQuestion = s.currentQuestion || null;
  const currentQuestionNumber = s.currentQuestionNumber || 0;
  const answeredQA = s.answeredQA || [];
  const diagnosis = s.diagnosis || null;

  const pageClass = isDark
    ? "min-h-screen w-full bg-black text-zinc-100"
    : "min-h-screen w-full bg-[radial-gradient(circle_at_top,_#ecfeff,_#f8fafc_45%,_#eef2ff_100%)] text-slate-900";

  const cardClass = isDark
    ? "border border-zinc-800 bg-zinc-950 shadow-[0_10px_30px_rgba(0,0,0,0.55)]"
    : "border border-cyan-100 bg-white/90 shadow-[0_10px_30px_rgba(2,132,199,0.12)]";

  // ── Core API call ─────────────────────────────────────────────────────────
  const callApi = useCallback(
    async (query, currentHistory, currentQuestionCount) => {
      setLoading(true);
      setError("");
      try {
        const data = await sendChatRequest(query, currentHistory, currentQuestionCount);

        if (data.stage === "questioning") {
          updateActiveSession((sess) => ({
            ...sess,
            stage: "questioning",
            currentQuestion: data.question,
            currentQuestionNumber: data.question_number,
            history: [...(sess.history || []), { role: "assistant", content: data.question }],
          }));
        } else if (data.stage === "final") {
          updateActiveSession((sess) => ({
            ...sess,
            stage: "final",
            diagnosis: data,
          }));
        }
      } catch (err) {
        setError(normalizeError(err));
      } finally {
        setLoading(false);
      }
    },
    [updateActiveSession]
  );

  // ── User submits initial symptom ─────────────────────────────────────────
  const handleStartConsultation = async (symptomText) => {
    if (!symptomText.trim()) return;
    const text = symptomText.trim();
    const userMsg = { role: "user", content: text };

    // Update session title + reset consultation state
    updateActiveSession((sess) => ({
      ...sess,
      title: text.length > 40 ? text.slice(0, 40) + "…" : text,
      symptom: text,
      stage: "questioning",
      history: [userMsg],
      questionCount: 0,
      answeredQA: [],
      currentQuestion: null,
      currentQuestionNumber: 0,
      diagnosis: null,
    }));

    await callApi(text, [userMsg], 0);
  };

  // ── User answers a question ───────────────────────────────────────────────
  const handleSubmitAnswer = async () => {
    if (!answer.trim() || loading) return;
    const answerText = answer.trim();
    setAnswer("");

    const newQA = [...answeredQA, { question: currentQuestion, answer: answerText }];
    const userMsg = { role: "user", content: answerText };
    const newHistory = [...history, userMsg];
    const newCount = questionCount + 1;

    updateActiveSession((sess) => ({
      ...sess,
      answeredQA: newQA,
      history: newHistory,
      questionCount: newCount,
    }));

    await callApi(answerText, newHistory, newCount);
  };

  // ── Reset active session consultation ─────────────────────────────────────
  const handleReset = () => {
    setAnswer("");
    setError("");
    updateActiveSession((sess) => ({
      ...sess,
      stage: "idle",
      symptom: "",
      history: [],
      questionCount: 0,
      answeredQA: [],
      currentQuestion: null,
      currentQuestionNumber: 0,
      diagnosis: null,
      title: "New consultation",
    }));
  };

  // When switching sessions, clear local transient state
  const handleSetActiveSession = (id) => {
    setAnswer("");
    setError("");
    setActiveSessionId(id);
  };

  return (
    <div className={pageClass}>
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <Header
          isDark={isDark}
          setTheme={setTheme}
          startNewChat={startNewChat}
          onBack={() => navigate("/")}
          cardClass={cardClass}
        />

        <div className="mt-4 grid flex-1 gap-4 lg:grid-cols-[280px_1fr]">
          {/* ── Sidebar ── */}
          <Sidebar
            sessions={sessions}
            activeSession={activeSession}
            setActiveSessionId={handleSetActiveSession}
            isDark={isDark}
            cardClass={cardClass}
          />

          {/* ── Main content ── */}
          <section className={`flex flex-col rounded-2xl p-4 sm:p-6 ${cardClass}`}>
            {/* Progress bar */}
            {stage === "questioning" && (
              <div className="mb-5 shrink-0">
                <div className="mb-2 flex items-center justify-between text-xs font-semibold">
                  <span className={isDark ? "text-zinc-400" : "text-slate-500"}>
                    Consultation progress
                  </span>
                  <span className={isDark ? "text-cyan-400" : "text-cyan-600"}>
                    Question {currentQuestionNumber} of {MAX_QUESTIONS}
                  </span>
                </div>
                <div className={`h-2 w-full overflow-hidden rounded-full ${isDark ? "bg-zinc-800" : "bg-slate-200"}`}>
                  <div
                    className="progress-bar h-2 rounded-full bg-gradient-to-r from-cyan-500 to-teal-400 transition-all duration-700"
                    style={{ width: `${(currentQuestionNumber / MAX_QUESTIONS) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Idle */}
            {stage === "idle" && (
              <SymptomEntry
                onStart={handleStartConsultation}
                loading={loading}
                error={error}
                isDark={isDark}
                cardClass={cardClass}
              />
            )}

            {/* Questioning */}
            {stage === "questioning" && (
              <QuestionCard
                question={currentQuestion}
                questionNumber={currentQuestionNumber}
                totalQuestions={MAX_QUESTIONS}
                answeredQA={answeredQA}
                answer={answer}
                setAnswer={setAnswer}
                onSubmit={handleSubmitAnswer}
                loading={loading}
                error={error}
                isDark={isDark}
                cardClass={cardClass}
                symptomSummary={symptom}
              />
            )}

            {/* Final */}
            {stage === "final" && (
              <DiagnosisCard
                diagnosis={diagnosis}
                answeredQA={answeredQA}
                symptomSummary={symptom}
                onReset={handleReset}
                isDark={isDark}
                cardClass={cardClass}
              />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}