import { FaPaperPlane } from "react-icons/fa";

export default function ChatInput({ input, setInput, sendMessage, loading, isDark }) {
  return (
    <footer className="mt-4">
      <div className="flex items-end gap-3">
        <textarea
          rows={1}
          placeholder="Describe your symptoms..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          disabled={loading}
          className={`max-h-32 min-h-[50px] flex-1 resize-none rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-cyan-500 ${
            isDark 
              ? "border-zinc-800 bg-zinc-900 text-zinc-100" 
              : "border-slate-200 bg-white text-slate-700"
          }`}
        />

        <button
          onClick={sendMessage}
          disabled={!input.trim() || loading}
          className="flex h-[50px] w-[50px] items-center justify-center rounded-full bg-cyan-600 text-white shadow-lg transition hover:bg-cyan-700 disabled:bg-slate-300"
        >
          <FaPaperPlane size={16} />
        </button>
      </div>
    </footer>
  );
}