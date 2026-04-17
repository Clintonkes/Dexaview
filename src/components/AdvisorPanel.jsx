/**
 * AdvisorPanel.jsx
 * ----------------
 * Displays the conversation with the AI Technical Advisor.
 *
 * Props:
 *   messages      – array of { role, content, timestamp } objects
 *   inputValue    – controlled value for the text input
 *   onInputChange – change handler for the text input
 *   onSubmit      – called when the user submits a question
 *
 * The message list auto-scrolls to the latest message whenever the messages
 * array changes.
 */

import { useEffect, useRef } from "react";
import "./AdvisorPanel.css";

export default function AdvisorPanel({
  messages,
  inputValue,
  onInputChange,
  onSubmit,
}) {
  const listRef = useRef(null);

  // Auto-scroll the message list when new messages arrive
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  return (
    <div className="advisor-panel">
      <header className="advisor-panel__header">
        <div className="advisor-panel__indicator" />
        <span className="advisor-panel__title">TECHNICAL ADVISOR</span>
        <span className="advisor-panel__subtitle">AI · GPT-4o</span>
      </header>

      {/* Message thread */}
      <div className="advisor-panel__messages" ref={listRef}>
        {messages.length === 0 && (
          <p className="advisor-panel__empty">
            Ask a question or trigger a simulation event to get expert guidance.
          </p>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`advisor-panel__message advisor-panel__message--${msg.role}`}
          >
            <span className="advisor-panel__role">
              {msg.role === "user" ? "YOU" : msg.role === "error" ? "ERR" : "AI"}
            </span>
            <p className="advisor-panel__content">{msg.content}</p>
            <time className="advisor-panel__time">
              {new Date(msg.timestamp).toLocaleTimeString()}
            </time>
          </div>
        ))}
      </div>

      {/* Input form */}
      <div className="advisor-panel__input-row">
        <input
          className="advisor-panel__input"
          type="text"
          placeholder="Describe a scenario or ask a question…"
          value={inputValue}
          onChange={onInputChange}
          onKeyDown={(e) => e.key === "Enter" && onSubmit(e)}
        />
        <button className="advisor-panel__send" onClick={onSubmit}>
          ASK
        </button>
      </div>
    </div>
  );
}
