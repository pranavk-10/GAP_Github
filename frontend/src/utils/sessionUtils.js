export const buildInitialMessage = () => ({
  sender: "bot",
  text: "Welcome to BEAST. Describe your symptom and I'll ask a few questions — one at a time — before giving you personalised guidance.",
  time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
});

const createSessionId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// Consultation state stored per session so switching sessions restores progress
export const createSession = (title = "New consultation") => ({
  id: createSessionId(),
  title,
  createdAt: Date.now(),
  // Wizard state
  stage: "idle",
  symptom: "",
  history: [],
  questionCount: 0,
  currentQuestion: null,
  currentQuestionNumber: 0,
  answeredQA: [],
  diagnosis: null,
});

export const loadSessions = (sessionsKey) => {
  try {
    const raw = localStorage.getItem(sessionsKey);
    if (!raw) return [createSession()];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return [createSession()];

    const valid = parsed.filter(
      (s) =>
        s &&
        typeof s.id === "string" &&
        typeof s.title === "string",
    );
    return valid.length > 0 ? valid : [createSession()];
  } catch {
    return [createSession()];
  }
};

export const clipForHistory = (text, maxLength = 1400) => {
  if (!text) return "";
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
};

export const toHistoryPayload = (chatHistory) =>
  chatHistory
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-8)
    .map((m) => ({
      role: m.role,
      content: clipForHistory(m.content),
    }));