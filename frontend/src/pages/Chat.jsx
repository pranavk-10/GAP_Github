import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useTheme from "../hooks/useTheme";
import useAuth from "../hooks/useAuth";
import useSessions from "../hooks/useSessions";
import { sendChatRequest, saveSession, fetchSessions } from "../services/chatServics";
import { normalizeError } from "../utils/errorUtils";
import { createSession } from "../utils/sessionUtils";
import Header from "../components/layout/Header";
import Sidebar from "../components/layout/Sidebar";
import SymptomEntry from "../components/chat/SymptomEntry";
import QuestionCard from "../components/chat/QuestionCard";
import DiagnosisCard from "../components/chat/DiagnosisCard";
import AuthModal from "../components/AuthModal";

const MAX_QUESTIONS = 5;

export default function Chat() {
  const { setTheme, isDark } = useTheme();
  const navigate = useNavigate();
  const { token, user, isLoggedIn, login, logout } = useAuth();

  const {
    sessions,
    setSessions,
    activeSession,
    setActiveSessionId,
    updateActiveSession,
    startNewChat,
  } = useSessions();

  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);

  // ── Load sessions from MongoDB when user logs in ──────────────────────────
  useEffect(() => {
    if (!isLoggedIn) return;
    fetchSessions(token)
      .then((remoteSessions) => {
        if (remoteSessions.length > 0) {
          // Map backend field names back to frontend shape
          const mapped = remoteSessions.map((s) => ({
            id: s.session_id,
            title: s.title,
            stage: s.stage,
            symptom: s.symptom,
            history: [],                          // not stored server-side (too large)
            questionCount: s.question_count,
            currentQuestion: null,
            currentQuestionNumber: s.current_question_number,
            answeredQA: s.answered_qa || [],
            diagnosis: s.diagnosis || null,
            followUpMessages: s.follow_up_messages || [],
            createdAt: s.created_at,
          }));
          setSessions(mapped);
          setActiveSessionId(mapped[0]?.id);
        }
      })
      .catch(() => {}); // silently ignore — use localStorage sessions as fallback
  }, [isLoggedIn, token]);

  // ── Auto-save session to MongoDB on every update (if logged in) ───────────
  useEffect(() => {
    if (!isLoggedIn || !activeSession) return;
    saveSession(activeSession, token).catch(() => {});
  }, [activeSession, isLoggedIn]);

  // ── Aliases into activeSession ────────────────────────────────────────────
  const s = activeSession || {};
  const stage = s.stage || "idle";
  const symptom = s.symptom || "";
  const history = s.history || [];
  const questionCount = s.questionCount || 0;
  const currentQuestion = s.currentQuestion || null;
  const currentQuestionNumber = s.currentQuestionNumber || 0;
  const answeredQA = s.answeredQA || [];
  const diagnosis = s.diagnosis || null;
  const followUpMessages = s.followUpMessages || [];

  const pageClass = isDark
    ? "min-h-screen w-full bg-black text-zinc-100"
    : "min-h-screen w-full bg-[radial-gradient(circle_at_top,_#ecfeff,_#f8fafc_45%,_#eef2ff_100%)] text-slate-900";

  const cardClass = isDark
    ? "border border-zinc-800 bg-zinc-950 shadow-[0_10px_30px_rgba(0,0,0,0.55)]"
    : "border border-cyan-100 bg-white/90 shadow-[0_10px_30px_rgba(2,132,199,0.12)]";

  // ── Core API call ─────────────────────────────────────────────────────────
  const callApi = useCallback(async (query, currentHistory, currentQuestionCount, options = {}) => {
    setLoading(true);
    setError("");
    try {
      const data = await sendChatRequest(query, currentHistory, currentQuestionCount, options);
      if (data.stage === "questioning") {
        updateActiveSession((sess) => ({
          ...sess,
          stage: "questioning",
          currentQuestion: data.question,
          currentQuestionNumber: data.question_number,
          history: [...(sess.history || []), { role: "assistant", content: data.question }],
        }));
      } else if (data.stage === "final") {
        updateActiveSession((sess) => ({ ...sess, stage: "final", diagnosis: data }));
      } else if (data.stage === "follow_up") {
        updateActiveSession((sess) => ({
          ...sess,
          followUpMessages: [
            ...(sess.followUpMessages || []),
            { role: "assistant", content: data.answer },
          ],
        }));
      }
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setLoading(false);
    }
  }, [updateActiveSession]);

  // ── Start consultation ────────────────────────────────────────────────────
  const handleStartConsultation = async (symptomText) => {
    if (!symptomText.trim()) return;
    const text = symptomText.trim();
    const userMsg = { role: "user", content: text };
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

  // ── Submit answer ─────────────────────────────────────────────────────────
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

  // ── End Chat Early (force final assessment) ───────────────────────
  const handleForceEnd = async () => {
    if (loading) return;
    const userMsg = { role: "user", content: "[User ended consultation early]" };
    const newHistory = [...history, userMsg];
    updateActiveSession((sess) => ({ ...sess, history: newHistory }));
    await callApi(symptom || "Please assess based on what we've discussed.", newHistory, questionCount, { forceFinal: true });
  };

  // ── Continue Chat (post-diagnosis follow-up) ────────────────────
  const handleFollowUp = async (followUpText) => {
    if (!followUpText.trim() || loading) return;
    const userMsg = { role: "user", content: followUpText };
    updateActiveSession((sess) => ({
      ...sess,
      followUpMessages: [...(sess.followUpMessages || []), { role: "user", content: followUpText }],
    }));
    const diagnosisContext = diagnosis
      ? `Assessment: ${diagnosis.assessment}. Advice: ${(diagnosis.advice || []).join("; ")}.`
      : "";
    await callApi(
      followUpText,
      [...history, userMsg],
      questionCount,
      { followUpMode: true, diagnosisContext }
    );
  };

  // ── Reset ─────────────────────────────────────────────────────────────────
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
      followUpMessages: [],
      title: "New consultation",
    }));
  };

  // ── Auth handlers ─────────────────────────────────────────────────────────
  const handleAuthSuccess = (newToken, newUser) => {
    login(newToken, newUser);
  };

  const handleLogout = () => {
    logout();
    // Reset to fresh local session on logout
    const fresh = createSession();
    setSessions([fresh]);
    setActiveSessionId(fresh.id);
  };

  const handleSetActiveSession = (id) => {
    setAnswer("");
    setError("");
    setActiveSessionId(id);
  };

  return (
    <div className={pageClass}>
      {showAuthModal && (
        <AuthModal
          isDark={isDark}
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
        />
      )}

      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <Header
          isDark={isDark}
          setTheme={setTheme}
          startNewChat={startNewChat}
          onBack={() => navigate("/")}
          cardClass={cardClass}
          user={user}
          isLoggedIn={isLoggedIn}
          onLoginClick={() => setShowAuthModal(true)}
          onLogout={handleLogout}
        />

        <div className="mt-4 grid flex-1 gap-4 lg:grid-cols-[280px_1fr]">
          <Sidebar
            sessions={sessions}
            activeSession={activeSession}
            setActiveSessionId={handleSetActiveSession}
            isDark={isDark}
            cardClass={cardClass}
            isLoggedIn={isLoggedIn}
            onLoginClick={() => setShowAuthModal(true)}
          />

          <section className={`flex flex-col rounded-2xl p-4 sm:p-6 ${cardClass}`}>
            {/* Progress bar */}
            {stage === "questioning" && (
              <div className="mb-5 shrink-0">
                <div className="mb-2 flex items-center justify-between text-xs font-semibold">
                  <span className={isDark ? "text-zinc-400" : "text-slate-500"}>Consultation progress</span>
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

            {stage === "idle" && (
              <SymptomEntry
                onStart={handleStartConsultation}
                loading={loading}
                error={error}
                isDark={isDark}
                cardClass={cardClass}
              />
            )}

            {stage === "questioning" && (
              <QuestionCard
                question={currentQuestion}
                questionNumber={currentQuestionNumber}
                totalQuestions={MAX_QUESTIONS}
                answeredQA={answeredQA}
                answer={answer}
                setAnswer={setAnswer}
                onSubmit={handleSubmitAnswer}
                onForceEnd={handleForceEnd}
                loading={loading}
                error={error}
                isDark={isDark}
                cardClass={cardClass}
                symptomSummary={symptom}
              />
            )}

            {stage === "final" && (
              <DiagnosisCard
                diagnosis={diagnosis}
                answeredQA={answeredQA}
                symptomSummary={symptom}
                onReset={handleReset}
                onFollowUp={handleFollowUp}
                followUpMessages={followUpMessages}
                followUpLoading={loading}
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