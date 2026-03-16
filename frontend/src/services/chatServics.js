import axios from "axios";
import { API_BASE } from "../constants/config";

// ── Chat API ─────────────────────────────────────────────────────────────────

export const sendChatRequest = async (query, history, questionCount = 0) => {
  const response = await axios.post(`${API_BASE}/api/chat`, {
    query,
    history,
    question_count: questionCount,
  });
  return response?.data;
};

// ── Session API (requires JWT token) ─────────────────────────────────────────

const authHeaders = (token) => ({ Authorization: `Bearer ${token}` });

export const fetchSessions = async (token) => {
  const { data } = await axios.get(`${API_BASE}/sessions`, {
    headers: authHeaders(token),
  });
  return data.sessions || [];
};

export const saveSession = async (session, token) => {
  await axios.post(
    `${API_BASE}/sessions`,
    {
      session_id: session.id,
      title: session.title,
      stage: session.stage,
      symptom: session.symptom,
      question_count: session.questionCount,
      current_question_number: session.currentQuestionNumber,
      answered_qa: session.answeredQA,
      diagnosis: session.diagnosis || null,
      created_at: session.createdAt,
    },
    { headers: authHeaders(token) }
  );
};