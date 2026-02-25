import { useEffect, useState } from "react";
import { SESSIONS_KEY } from "../constants/config";
import { createSession, loadSessions } from "../utils/sessionUtils";

export default function useSessions() {
  const [sessions, setSessions] = useState(() =>
    loadSessions(SESSIONS_KEY)
  );

  const [activeSessionId, setActiveSessionId] = useState(
    sessions[0]?.id
  );

  useEffect(() => {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  }, [sessions]);

  const activeSession =
    sessions.find((s) => s.id === activeSessionId) ||
    sessions[0];

  const updateActiveSession = (updater) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSession.id ? updater(s) : s
      )
    );
  };

  const startNewChat = () => {
    const session = createSession();
    setSessions((prev) => [session, ...prev]);
    setActiveSessionId(session.id);
  };

  return {
    sessions,
    activeSession,
    setActiveSessionId,
    updateActiveSession,
    startNewChat,
  };
}