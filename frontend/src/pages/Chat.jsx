import { use, useState } from "react";
import useTheme from "../hooks/useTheme";
import useSessions from "../hooks/useSessions";
import { toHistoryPayload } from "../utils/sessionUtils";
import { normalizeError } from "../utils/errorUtils";
import { sendChatRequest } from "../services/chatServics";

import Header from "../components/layout/Header";
import Sidebar from "../components/layout/Sidebar";
import ChatWindow from "../components/chat/ChatWindow";
import ChatInput from "../components/chat/ChatInput";
import { useNavigate } from "react-router-dom";

export default function Chat() {
    const { theme, setTheme, isDark } = useTheme();
    const {
        sessions,
        activeSession,
        setActiveSessionId,
        updateActiveSession,
        startNewChat,
    } = useSessions();

    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const pageClass = isDark ? "min-h-screen w-full bg-black text-zinc-100" : "min-h-screen w-full bg-[radial-gradient(circle_at_top,_#ecfeff,_#f8fafc_45%,_#eef2ff_100%)] text-slate-900";
    const cardClass = isDark ? "border border-zinc-800 bg-zinc-950 shadow-[0_10px_30px_rgba(0,0,0,0.55)]" : "border border-cyan-100 bg-white/90 shadow-[0_10px_30px_rgba(2,132,199,0.12)]";

    const sendMessage = async () => {
        if (!input.trim()) return;

        const userMessage = {
            sender: "user",
            text: input,
            time: new Date().toLocaleTimeString(),
        };

        updateActiveSession((s) => ({
            ...s,
            messages: [...s.messages, userMessage],
        }));

        const history = toHistoryPayload(activeSession.messages);
        setInput("");
        setLoading(true);

        try {
            const response = await sendChatRequest(input, history);

            updateActiveSession((s) => ({
                ...s,
                messages: [
                    ...s.messages,
                    {
                        sender: "bot",
                        text: response || "No response",
                        time: new Date().toLocaleTimeString(),
                    },
                ],
            }));
        } catch (error) {
            updateActiveSession((s) => ({
                ...s,
                messages: [
                    ...s.messages,
                    {
                        sender: "bot",
                        text: `Error: ${normalizeError(error)}`,
                        time: "Now",
                    },
                ],
            }));
        }

        setLoading(false);
    };

    return (
        <div className={pageClass}>
            <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
                <Header isDark={isDark} setTheme={setTheme} startNewChat={startNewChat} onBack={() => navigate("/")} cardClass={cardClass} />
                
                <div className="mt-4 grid flex-1 gap-4 lg:grid-cols-[280px_1fr]">
                    <Sidebar sessions={sessions} activeSession={activeSession} setActiveSessionId={setActiveSessionId} isDark={isDark} cardClass={cardClass} />
                    
                    <section className={`flex flex-col rounded-2xl p-4 sm:p-5 ${cardClass}`}>
                        <ChatWindow messages={activeSession?.messages || []} loading={loading} isDark={isDark} />
                        <ChatInput input={input} setInput={setInput} sendMessage={sendMessage} loading={loading} isDark={isDark} />
                    </section>
                </div>
            </div>
        </div>
    );
}