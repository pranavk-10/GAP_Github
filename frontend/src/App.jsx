import { useState, useRef, useEffect } from "react";
import axios from "axios";
import {
  FaPaperPlane,
  FaRobot,
  FaUser,
  FaPlus,
  FaMicrophone,
} from "react-icons/fa";

function App() {
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "Hello! I’m MediBot.\n\nYour smart medical assistant. How can I help you today?",
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userText = input;
    setInput("");

    setMessages((prev) => [
      ...prev,
      {
        sender: "user",
        text: userText,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);

    setLoading(true);

    try {
      const res = await axios.post("http://localhost:8000/api/chat", {
        query: userText,
      });

      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: res.data.response,
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Unable to connect. Please check your internet connection.",
          time: "Now",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50 text-slate-900 font-sans">

      {/* ================= HEADER ================= */}
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <FaRobot size={14} />
            </div>
            <div>
              <h1 className="text-sm font-semibold">
                Beast
              </h1>
              <p className="text-[11px] text-slate-500">
                Medical Assistant
              </p>
            </div>
          </div>

          <button
            onClick={() => setMessages(messages.slice(0, 1))}
            className="text-xs font-bold  text-blue-600 hover:underline"
          >
            Clear chat
          </button>
        </div>
      </header>

      {/* ================= CHAT ================= */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${
                msg.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.sender === "bot" && (
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                  <FaRobot size={12} />
                </div>
              )}

              <div
                className={`max-w-[75%] px-4 py-3 text-sm leading-relaxed rounded-lg border ${
                  msg.sender === "bot"
                    ? "bg-white border-slate-200 text-slate-700 border-l-4 border-l-blue-500"
                    : "bg-blue-600 text-white border-blue-600"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>
                <div className="text-[10px] opacity-60 mt-1 text-right">
                  {msg.time}
                </div>
              </div>

              {msg.sender === "user" && (
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center">
                  <FaUser size={12} />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                <FaRobot size={12} />
              </div>
              <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-500">
                Typing…
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </main>

      {/* ================= INPUT ================= */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2 bg-white focus-within:border-blue-500">
            <button className="text-slate-400 hover:text-blue-600">
              <FaPlus />
            </button>

            <input
              type="text"
              placeholder="Ask a health-related question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              disabled={loading}
              className="flex-1 text-sm outline-none text-slate-800 placeholder:text-slate-400"
            />

            <button className="text-slate-400 hover:text-blue-600">
              <FaMicrophone />
            </button>

            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-md hover:bg-blue-700 disabled:bg-slate-300"
            >
              Send
            </button>
          </div>

          <p className="text-center text-[11px] text-slate-400 mt-2">
            Medical information only — not a diagnosis.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
