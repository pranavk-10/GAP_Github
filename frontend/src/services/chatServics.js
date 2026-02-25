import axios from "axios";
import { API_BASE } from "../constants/config";

export const sendChatRequest = async (query, history) => {
  const response = await axios.post(`${API_BASE}/api/chat`, {
    query,
    history,
  });

  return response?.data?.response;
};