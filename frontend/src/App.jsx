import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  FaArrowLeft,
  FaBookOpen,
  FaMoon,
  FaPaperPlane,
  FaPlus,
  FaRobot,
  FaSun,
  FaUser,
} from "react-icons/fa";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(/\/$/, "");
const LOGO_PATH = "/Beast-logo.webp";
const SESSIONS_KEY = "beast-sessions";

const buildInitialMessage = () => ({
  sender: "bot",
  text: "Welcome to BEAST. Ask your symptom in English or Hindi, and I will respond in the same language.",
  time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
});

const createSessionId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createSession = (title = "New chat") => ({
  id: createSessionId(),
  title,
  createdAt: Date.now(),
  messages: [buildInitialMessage()],
});

const loadSessions = () => {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [createSession()];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return [createSession()];

    const valid = parsed.filter(
      (s) =>
        s &&
        typeof s.id === "string" &&
        typeof s.title === "string" &&
        Array.isArray(s.messages) &&
        s.messages.length > 0,
    );
    return valid.length > 0 ? valid : [createSession()];
  } catch {
    return [createSession()];
  }
};

function App() {
  const [screen, setScreen] = useState("home");
  const [showInfo, setShowInfo] = useState(false);
  const [sessions, setSessions] = useState(loadSessions);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("beast-theme") || "light");
  const [logoFailed, setLogoFailed] = useState(false);
  const bottomRef = useRef(null);

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) || sessions[0] || null,
    [sessions, activeSessionId],
  );
  const messages = activeSession?.messages || [];

  useEffect(() => {
    localStorage.setItem("beast-theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    if (!activeSessionId && sessions.length > 0) {
      setActiveSessionId(sessions[0].id);
      return;
    }
    if (!activeSession && sessions.length > 0) {
      setActiveSessionId(sessions[0].id);
    }
  }, [activeSessionId, activeSession, sessions]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const clipForHistory = (text, maxLength = 1400) => {
    if (!text) return "";
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  };

  const toHistoryPayload = (chatMessages) =>
    chatMessages
      .filter((m) => (m.sender === "user" || m.sender === "bot") && !String(m.text).startsWith("Error:"))
      .slice(-8)
      .map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: clipForHistory(m.text),
      }));

  const sessionTimeline = useMemo(
    () =>
      sessions.map((session) => ({
        id: session.id,
        label: session.title || "New chat",
        time: new Date(session.createdAt || Date.now()).toLocaleString([], {
          month: "short",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
      })),
    [sessions],
  );

  const isDark = theme === "dark";

  const pageClass = isDark
    ? "min-h-screen w-full bg-black text-zinc-100"
    : "min-h-screen w-full bg-[radial-gradient(circle_at_top,_#ecfeff,_#f8fafc_45%,_#eef2ff_100%)] text-slate-900";

  const cardClass = isDark
    ? "border border-zinc-800 bg-zinc-950 shadow-[0_10px_30px_rgba(0,0,0,0.55)]"
    : "border border-cyan-100 bg-white/90 shadow-[0_10px_30px_rgba(2,132,199,0.12)]";

  const markdownComponents = {
    h3: ({ children }) => <h3 className="mt-2 text-base font-semibold">{children}</h3>,
    p: ({ children }) => <p className="mt-2 whitespace-pre-wrap leading-6">{children}</p>,
    ol: ({ children }) => <ol className="mt-2 list-decimal space-y-2 pl-5">{children}</ol>,
    ul: ({ children }) => <ul className="mt-2 list-disc space-y-2 pl-5">{children}</ul>,
    li: ({ children }) => <li className="leading-6">{children}</li>,
  };

  const normalizeError = (error) => {
    if (!error) return "Unknown error.";

    const detail = error?.response?.data?.detail ?? error?.response?.data;
    if (typeof detail === "string" && detail.trim()) return detail;

    if (detail && typeof detail === "object") {
      try {
        return JSON.stringify(detail);
      } catch {
        return "Unexpected error response.";
      }
    }

    if (typeof error.message === "string" && error.message.trim()) return error.message;

    return "Unable to connect to the medical assistant server.";
  };

  const updateActiveSession = (updater) => {
    if (!activeSession) return;
    setSessions((prev) => prev.map((s) => (s.id === activeSession.id ? updater(s) : s)));
  };

  const sendMessage = async () => {
    if (!input.trim() || loading || !activeSession) return;

    const userText = input.trim();
    const userMessage = {
      sender: "user",
      text: userText,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const historyPayload = toHistoryPayload(activeSession.messages);

    setInput("");
    updateActiveSession((session) => ({
      ...session,
      title: session.title === "New chat" ? userText.slice(0, 48) : session.title,
      messages: [...session.messages, userMessage],
    }));
    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE}/api/chat`, {
        query: userText,
        history: historyPayload,
      });

      updateActiveSession((session) => ({
        ...session,
        messages: [
          ...session.messages,
          {
            sender: "bot",
            text: response?.data?.response || "No response returned by the server.",
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ],
      }));
    } catch (error) {
      updateActiveSession((session) => ({
        ...session,
        messages: [
          ...session.messages,
          {
            sender: "bot",
            text: `Error: ${normalizeError(error)}`,
            time: "Now",
          },
        ],
      }));
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = () => {
    const session = createSession();
    setSessions((prev) => [session, ...prev]);
    setActiveSessionId(session.id);
    setInput("");
  };

  if (screen === "home") {
    return (
      <div className={pageClass}>
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
          <header className={`rounded-2xl px-5 py-4 ${cardClass}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-cyan-600 text-white">
                  {!logoFailed ? (
                    <img src={LOGO_PATH} alt="BEAST logo" className="h-full w-full object-cover" onError={() => setLogoFailed(true)} />
                  ) : (
                    <FaRobot size={17} />
                  )}
                </div>
                <p className="text-xl font-semibold tracking-wide">BEAST Health</p>
              </div>

              <div className="hidden items-center gap-8 text-sm md:flex">
                <span className={isDark ? "text-zinc-300" : "text-slate-600"}>Who We Serve</span>
                <span className={isDark ? "text-zinc-300" : "text-slate-600"}>Research</span>
                <span className={isDark ? "text-zinc-300" : "text-slate-600"}>Safety</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
                  className={
                    isDark
                      ? "rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-100"
                      : "rounded-lg border border-cyan-200 bg-white px-3 py-2 text-xs font-semibold text-cyan-700"
                  }
                >
                  {isDark ? <FaSun className="inline-block" /> : <FaMoon className="inline-block" />} {isDark ? "Light" : "Dark"}
                </button>
                <button
                  onClick={() => setScreen("chat")}
                  className="rounded-full bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700"
                >
                  Start Chat
                </button>
              </div>
            </div>
          </header>

          <main className="mt-7 grid flex-1 items-center gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className={`rounded-3xl p-7 ${cardClass}`}>
              <p className={isDark ? "text-sm uppercase tracking-[0.2em] text-cyan-300" : "text-sm uppercase tracking-[0.2em] text-cyan-700"}>
                Clinical AI Companion
              </p>
              <h1 className="mt-4 text-5xl leading-[1.1] sm:text-6xl" style={{ fontFamily: "Georgia, Times New Roman, serif" }}>
                Calm medical
                <br />
                guidance, any hour.
              </h1>
              <p className={isDark ? "mt-5 max-w-xl text-lg text-zinc-300" : "mt-5 max-w-xl text-lg text-slate-700"}>
                Designed for structured triage. BEAST asks logical follow-ups, tracks context across sessions, and responds in the
                same language you type.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  onClick={() => setScreen("chat")}
                  className="rounded-full bg-cyan-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700"
                >
                  Chat with BEAST
                </button>
                <button
                  onClick={() => setShowInfo((prev) => !prev)}
                  className={
                    isDark
                      ? "rounded-full border border-zinc-700 bg-zinc-900 px-6 py-3 text-sm font-semibold text-zinc-100"
                      : "rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700"
                  }
                >
                  <FaBookOpen className="mr-2 inline-block" />
                  How BEAST works
                </button>
              </div>

              {showInfo && (
                <div
                  className={
                    isDark
                      ? "mt-6 rounded-2xl border border-zinc-700 bg-zinc-900/80 p-4 text-sm text-zinc-300"
                      : "mt-6 rounded-2xl border border-cyan-100 bg-cyan-50 p-4 text-sm text-slate-700"
                  }
                >
                  BEAST does not diagnose disease. It provides educational guidance and helps users prepare better information for
                  medical consultation.
                </div>
              )}
            </section>

            <section className={`relative overflow-hidden rounded-3xl p-6 ${cardClass}`}>
              <div className={isDark ? "absolute -right-10 -top-10 h-40 w-40 rounded-full bg-cyan-500/20 blur-2xl" : "absolute -right-10 -top-10 h-40 w-40 rounded-full bg-cyan-200/70 blur-2xl"} />
              <div className={isDark ? "absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-blue-500/20 blur-2xl" : "absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-blue-200/70 blur-2xl"} />

              <div className="relative space-y-4">
                <div className={isDark ? "ml-auto max-w-[85%] rounded-2xl bg-cyan-700/30 p-4 text-sm leading-6 text-zinc-100" : "ml-auto max-w-[85%] rounded-2xl bg-cyan-100 p-4 text-sm leading-6 text-slate-800"}>
                  I have a headache since last night and light sensitivity.
                </div>
                <div className={isDark ? "max-w-[92%] rounded-2xl border border-zinc-700 bg-zinc-900 p-4 text-sm leading-6 text-zinc-200" : "max-w-[92%] rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700"}>
                  <p className="font-semibold">BEAST triage:</p>
                  <p className="mt-2">
                    I understand. To guide safely, tell me when it started, pain severity (1-10), any fever or vomiting, and what
                    medicine you already took.
                  </p>
                </div>
                <div className={isDark ? "max-w-[92%] rounded-2xl border border-zinc-700 bg-zinc-900 p-4 text-xs text-zinc-400" : "max-w-[92%] rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-500"}>
                  Session history, language-aware responses, and structured red-flag guidance built in.
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className={pageClass}>
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className={`rounded-2xl p-4 ${cardClass}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setScreen("home")}
                className={
                  isDark
                    ? "rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-200"
                    : "rounded-lg border border-cyan-200 bg-white p-2 text-cyan-700"
                }
              >
                <FaArrowLeft />
              </button>
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-cyan-600 text-white">
                {!logoFailed ? (
                  <img
                    src={LOGO_PATH}
                    alt="BEAST logo"
                    className="h-full w-full object-cover"
                    onError={() => setLogoFailed(true)}
                  />
                ) : (
                  <FaRobot size={16} />
                )}
              </div>
              <div>
                <h1 className="text-base font-semibold">BEAST Chat</h1>
                <p className={isDark ? "text-xs text-slate-400" : "text-xs text-slate-500"}>
                  Session-based medical guidance
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={startNewChat}
                className={
                  isDark
                    ? "rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200"
                    : "rounded-lg border border-cyan-200 bg-white px-3 py-2 text-xs font-semibold text-cyan-700"
                }
              >
                <FaPlus className="mr-1 inline-block" /> New chat
              </button>
              <button
                onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
                className={
                  isDark
                    ? "rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100"
                    : "rounded-lg border border-cyan-200 bg-white px-3 py-2 text-xs font-semibold text-cyan-700"
                }
              >
                {isDark ? <FaSun className="inline-block" /> : <FaMoon className="inline-block" />}{" "}
                {isDark ? "Light" : "Dark"}
              </button>
            </div>
          </div>
        </header>

        <div className="mt-4 grid flex-1 gap-4 lg:grid-cols-[280px_1fr]">
          <aside className={`hidden rounded-2xl p-4 lg:block ${cardClass}`}>
            <h2 className="text-sm font-semibold">Chat History</h2>
            <div className="mt-3 space-y-2 overflow-y-auto pr-1" style={{ maxHeight: "calc(100vh - 220px)" }}>
              {sessionTimeline.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSessionId(item.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-xs ${
                    item.id === activeSession?.id
                      ? "border-cyan-500 bg-cyan-600/20 text-cyan-200"
                      : isDark
                        ? "border-slate-700 bg-slate-800 text-slate-300"
                        : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  <p className="line-clamp-2">{item.label}</p>
                  <p className={isDark ? "mt-1 text-[10px] text-slate-500" : "mt-1 text-[10px] text-slate-400"}>
                    {item.time}
                  </p>
                </button>
              ))}
            </div>
          </aside>

          <section className={`flex flex-col rounded-2xl p-4 sm:p-5 ${cardClass}`}>
            <main className="flex-1 overflow-y-auto">
              <div className="space-y-5">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.sender === "bot" && (
                      <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-cyan-600 text-white">
                        <FaRobot size={12} />
                      </div>
                    )}

                    <div
                      className={`max-w-[88%] rounded-2xl border px-4 py-3 text-sm leading-relaxed sm:max-w-[76%] ${
                        msg.sender === "user"
                          ? "border-cyan-600 bg-cyan-600 text-white"
                          : isDark
                            ? "border-slate-700 bg-slate-800 text-slate-100"
                            : "border-slate-200 bg-white text-slate-800"
                      }`}
                    >
                      {msg.sender === "bot" ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                          {msg.text}
                        </ReactMarkdown>
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      )}
                      <p
                        className={
                          isDark ? "mt-2 text-right text-[10px] text-slate-500" : "mt-2 text-right text-[10px] text-slate-400"
                        }
                      >
                        {msg.time}
                      </p>
                    </div>

                    {msg.sender === "user" && (
                      <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-cyan-700 text-white">
                        <FaUser size={12} />
                      </div>
                    )}
                  </div>
                ))}

                {loading && (
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-cyan-600 text-white">
                      <FaRobot size={12} />
                    </div>
                    <div
                      className={
                        isDark
                          ? "rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-300"
                          : "rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500"
                      }
                    >
                      Thinking...
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>
            </main>

            <footer className="mt-4">
              <div className="flex items-end gap-2">
                <textarea
                  rows={2}
                  placeholder="Describe your symptoms. Example: I have headache since morning and took paracetamol."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  disabled={loading}
                  className={
                    isDark
                      ? "max-h-36 min-h-12 flex-1 resize-y rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500"
                      : "max-h-36 min-h-12 flex-1 resize-y rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-cyan-500"
                  }
                />

                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-600 text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                  aria-label="Send"
                >
                  <FaPaperPlane size={14} />
                </button>
              </div>

              <p className="mt-2 text-center text-[11px] text-slate-500">
                Educational guidance only. Not a medical diagnosis.
              </p>
            </footer>
          </section>
        </div>
      </div>
    </div>
  );
}

export default App;
