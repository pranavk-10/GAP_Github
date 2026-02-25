import axios from "axios";
import { API_BASE } from "../constants/config";

export const sendChatRequest = async (query, history, questionCount = 0) => {
  const response = await axios.post(`${API_BASE}/api/chat`, {
    query,
    history,
    question_count: questionCount,
  });
  return response?.data;
};