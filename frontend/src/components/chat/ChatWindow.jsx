import { useEffect, useRef } from "react";
import ChatMessage from "./ChatMessage";

export default function ChatWindow({ messages, loading }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <div className="flex-1 overflow-y-auto space-y-4">
      {messages.map((msg, idx) => (
        <ChatMessage key={idx} msg={msg} />
      ))}

      {loading && <p>Thinking...</p>}
      <div ref={bottomRef} />
    </div>
  );
}