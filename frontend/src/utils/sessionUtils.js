export const buildInitialMessage = () => ({
  sender: "bot",
  text: "Welcome to BEAST. Ask your symptom in English or Hindi, and I will respond in the same language.",
  time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
});

const createSessionId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const createSession = (title = "New chat") => ({
  id: createSessionId(),
  title,
  createdAt: Date.now(),
  messages: [buildInitialMessage()],
});

export const loadSessions = () => {
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


export const clipForHistory = (text, maxLength = 1400) => {
    if (!text) return "";
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  };

export const toHistoryPayload = (chatMessages) =>
    chatMessages
      .filter((m) => (m.sender === "user" || m.sender === "bot") && !String(m.text).startsWith("Error:"))
      .slice(-8)
      .map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: clipForHistory(m.text),
 }));