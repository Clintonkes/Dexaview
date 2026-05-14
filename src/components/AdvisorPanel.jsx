/**
 * AdvisorPanel.jsx
 * src/components/AdvisorPanel.jsx
 */
import { useEffect, useRef } from "react";
import "./AdvisorPanel.css";

export default function AdvisorPanel({
  messages,
  inputValue,
  onInputChange,
  onSubmit,
  isLoading = false,
}) {
  const listRef = useRef(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isLoading]);

  return (
    <aside className="advisor">

      {/* Header */}
      <header className="advisor__header">
        <span className={`advisor__dot ${isLoading ? "advisor__dot--loading" : ""}`} />
        <span className="advisor__title dx-mono">AI ADVISOR</span>
        <span className="advisor__model">GPT-4o · Well Control</span>
      </header>

      {/* Message thread */}
      <div className="advisor__messages" ref={listRef}>
        {messages.length === 0 && !isLoading && (
          <div className="advisor__empty">
            <div className="advisor__empty-icon">⬡</div>
            <p>Trigger a simulation event or ask a question to receive expert guidance.</p>
            <p className="advisor__empty-hint">Responses cite API RP 53, IADC, OSHA, and ASHRAE standards.</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`advisor__msg advisor__msg--${msg.role}`}>
            <div className="advisor__msg-meta">
              <span className="advisor__msg-role dx-mono">
                {msg.role === "user" ? "YOU" : msg.role === "error" ? "ERR" : "ADVISOR"}
              </span>
              <time className="advisor__msg-time dx-mono">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </time>
            </div>
            <p className="advisor__msg-content">{msg.content}</p>
          </div>
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div className="advisor__msg advisor__msg--assistant advisor__msg--typing">
            <div className="advisor__msg-meta">
              <span className="advisor__msg-role dx-mono">ADVISOR</span>
            </div>
            <div className="advisor__typing-dots">
              <span /><span /><span />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form className="advisor__input-row" onSubmit={onSubmit}>
        <input
          className="advisor__input"
          type="text"
          placeholder="Ask about procedures, standards, actions…"
          value={inputValue}
          onChange={onInputChange}
          disabled={isLoading}
          autoComplete="off"
        />
        <button
          className="advisor__send"
          type="submit"
          disabled={isLoading || !inputValue.trim()}
          aria-label="Send question"
        >
          {isLoading ? <span className="advisor__send-spinner" /> : "→"}
        </button>
      </form>

    </aside>
  );
}
