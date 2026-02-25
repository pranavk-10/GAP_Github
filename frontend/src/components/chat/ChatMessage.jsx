import { FaRobot, FaUser } from "react-icons/fa";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
export default function ChatMessage({ msg, isDark }) {
  const isUser = msg.sender === "user";

  return (
    <div className={`flex items-start gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-cyan-600 text-white">
          <FaRobot size={12} />
        </div>
      )}
      <div className={`max-w-[88%] rounded-2xl border px-4 py-3 text-sm leading-relaxed sm:max-w-[76%] ${
        isUser 
          ? "border-cyan-600 bg-cyan-600 text-white" 
          : isDark ? "border-zinc-700 bg-zinc-900 text-zinc-100" : "border-slate-200 bg-white text-slate-800"
      }`}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
        <p className={`mt-2 text-right text-[10px] ${isDark ? "text-zinc-500" : "text-slate-400"}`}>{msg.time}</p>
      </div>
      {isUser && (
        <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-cyan-700 text-white">
          <FaUser size={12} />
        </div>
      )}
    </div>
  );
}