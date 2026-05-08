import { useState, useRef, useEffect } from "react";
import { api } from "../API/axios";
import "../CSS/ChatPanel.css";

export default function ChatPanel({ roomId, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const messageText = input.trim();
    setInput("");
    setSending(true);

    // Optimistic update
    const optimisticMsg = {
      id: Date.now(),
      text: messageText,
      sender: "You",
      timestamp: new Date().toISOString(),
      isLocal: true,
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      await api.post(`/room/${roomId}/chat`, {
        roomId,
        message: messageText,
      });
    } catch (err) {
      console.error("Failed to send message:", err);
      // Mark the message as failed
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimisticMsg.id ? { ...m, failed: true } : m
        )
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="chat-panel">
      {/* Header */}
      <div className="chat-header">
        <h3>💬 Chat</h3>
        <button className="chat-close" onClick={onClose} title="Close chat">
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <p>No messages yet</p>
            <small>Start the conversation!</small>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`chat-message ${msg.isLocal ? "local" : ""} ${
              msg.failed ? "failed" : ""
            }`}
          >
            <span className="msg-sender">{msg.sender}</span>
            <span className="msg-text">{msg.text}</span>
            {msg.failed && (
              <span className="msg-failed" title="Message failed to send">
                ⚠️
              </span>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form className="chat-input-form" onSubmit={sendMessage}>
        <input
          type="text"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={500}
          autoFocus
        />
        <button type="submit" disabled={!input.trim() || sending}>
          ➤
        </button>
      </form>
    </div>
  );
}
