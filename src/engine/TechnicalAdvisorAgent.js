/**
 * TechnicalAdvisorAgent.js
 * ------------------------
 * Wraps the OpenAI chat completions API to produce an AI-powered "Technical
 * Advisor" that understands industrial safety protocols (API RP 53, NFPA 72,
 * IEC 61511, etc.) and can guide operators through simulation scenarios.
 *
 * Usage:
 *   const agent = new TechnicalAdvisorAgent({ apiKey, industryMode, onResponse });
 *   agent.ask("Pressure is rising in the BOP – what is the first step?");
 *   // onResponse({ role, content, timestamp }) fires when the answer arrives
 *
 * The agent maintains a rolling conversation window capped at MAX_HISTORY turns
 * so the context stays relevant without growing unbounded.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Maximum number of user/assistant turn pairs to keep in the context window. */
const MAX_HISTORY = 20;

/**
 * System prompts keyed by industry mode.
 * Keep these concise but authoritative – the model will cite these frameworks
 * in its responses when relevant.
 */
const SYSTEM_PROMPTS = {
  oil_gas: `
You are a certified Well Control Specialist and HSE Technical Advisor operating
inside the Dexaview Industrial Metaverse. Your knowledge covers:
  • API RP 53 (Blowout Prevention Equipment Systems)
  • API RP 64 (Diverter Systems)
  • IADC Well Control Manual
  • OSHA 1910.119 (Process Safety Management)

When answering, always:
1. State the immediate safety action first.
2. Reference the relevant standard or procedure.
3. Provide a clear, ordered checklist when multiple steps are required.
4. Flag when a situation requires human escalation.

Respond in plain, unambiguous language. Avoid jargon unless you define it.
  `.trim(),

  data_center: `
You are a Senior Infrastructure Reliability Engineer and Technical Advisor for a
Tier-IV data centre simulation inside Dexaview. Your knowledge covers:
  • ANSI/TIA-942 (Data Centre Infrastructure Standard)
  • ASHRAE A2 thermal guidelines
  • IEEE 1100 (Powering and Grounding Sensitive Electronic Equipment)
  • NFPA 75 (Fire Protection of Information Technology Equipment)

Prioritise uptime, thermal management, and power redundancy in all guidance.
  `.trim(),
};

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

export class TechnicalAdvisorAgent {
  /**
   * @param {object}   opts
   * @param {string}   opts.apiKey       – OpenAI API key
   * @param {string}   opts.industryMode – key into SYSTEM_PROMPTS
   * @param {Function} opts.onResponse   – called with { role, content, timestamp }
   */
  constructor({ apiKey, industryMode = "oil_gas", onResponse }) {
    this._apiKey = apiKey;
    this._systemPrompt =
      SYSTEM_PROMPTS[industryMode] ?? SYSTEM_PROMPTS["oil_gas"];
    this._onResponse = onResponse;

    // Rolling history – only user/assistant messages (system is prepended separately)
    this._history = [];
  }

  // -------------------------------------------------------------------------
  // Public
  // -------------------------------------------------------------------------

  /**
   * Sends a question to the AI advisor. The response is delivered via the
   * onResponse callback rather than a return value so callers do not need to
   * await this method.
   * @param {string} question
   */
  async ask(question) {
    // Add the new user turn to the rolling window
    this._history.push({ role: "user", content: question });
    this._trimHistory();

    const messages = [
      { role: "system", content: this._systemPrompt },
      ...this._history,
    ];

    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this._apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages,
            temperature: 0.3, // Low temperature for deterministic safety guidance
            max_tokens: 600,
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message ?? response.statusText);
      }

      const data = await response.json();
      const assistantContent = data.choices[0].message.content;

      // Persist the assistant reply in history for follow-up context
      this._history.push({ role: "assistant", content: assistantContent });
      this._trimHistory();

      this._onResponse({
        role: "assistant",
        content: assistantContent,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("[TechnicalAdvisorAgent] API call failed:", error);
      this._onResponse({
        role: "error",
        content: `Advisor unavailable: ${error.message}`,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Clears the conversation history. Useful when switching between simulation
   * scenarios so the previous context does not bleed through.
   */
  clearHistory() {
    this._history = [];
  }

  // -------------------------------------------------------------------------
  // Private
  // -------------------------------------------------------------------------

  /**
   * Trims the rolling history to MAX_HISTORY turns by removing the oldest
   * user/assistant pair when the cap is exceeded.
   */
  _trimHistory() {
    while (this._history.length > MAX_HISTORY * 2) {
      this._history.splice(0, 2); // remove oldest user + assistant pair
    }
  }
}
