/**
 * ScenarioParser.js
 * -----------------
 * Converts free-form professional text into a structured Dexaview scenario
 * configuration using GPT-4o.
 *
 * A professional types something like:
 *   "Simulate a deepwater BOP failure at 1m30s. Pressure should spike to
 *    8,500 psi before the blowout. At 4 minutes the riser disconnects."
 *
 * This module sends that text to GPT-4o with a strict JSON schema prompt
 * and returns a scenario object ready to populate the Scenario Builder form.
 *
 * Usage:
 *   import { parseScenarioText } from "../engine/ScenarioParser";
 *   const result = await parseScenarioText(rawText, apiKey);
 *   if (result.ok) loadForm(result.scenario);
 *   else showError(result.error);
 */

// ---------------------------------------------------------------------------
// Supported values — must match ScenarioBuilder dropdowns exactly
// ---------------------------------------------------------------------------

const VALID_INDUSTRY_MODES = ["oil_gas", "data_center", "pipeline", "offshore", "manufacturing"];
const VALID_EVENT_TYPES    = ["blowout", "collapse", "fire", "flood", "pressure_spike"];
const VALID_STATUSES       = ["NOMINAL", "WARNING", "CRITICAL", "EMERGENCY"];

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `
You are a Dexaview Scenario Configuration Assistant.
Your job is to read a professional's plain-English description of an industrial
simulation and convert it into a precise JSON configuration object.

You must ALWAYS return valid JSON and nothing else — no markdown fences,
no explanation, no preamble. Only the raw JSON object.

The JSON must match this exact schema:

{
  "industryMode": one of ["oil_gas", "data_center", "pipeline", "offshore", "manufacturing"],
  "title": string (short, specific, professional),
  "description": string (2-4 sentences: what is the scenario, what industry, what is at stake),
  "videoSearchQuery": string (a YouTube search query to find a relevant training video),
  "cues": [
    {
      "time": string in "mm:ss" format,
      "eventName": one of ["blowout", "collapse", "fire", "flood", "pressure_spike"],
      "description": string (3-5 sentences: what happened, physical cause, required action, which standard applies),
      "telemetry": {
        "pressure": string (e.g. "3,200 psi" or "108% load" — use units appropriate to industry),
        "temp": string (e.g. "87°C" or "35°C inlet"),
        "status": one of ["NOMINAL", "WARNING", "CRITICAL", "EMERGENCY"]
      }
    }
  ]
}

Rules:
- Infer the industry from context clues (BOP/riser/mud = oil_gas, CRAC/UPS/server = data_center, etc.)
- If the user specifies timestamps, use them exactly in mm:ss format
- If timestamps are not specified, space events sensibly (first at ~00:45, subsequent every 60-90s)
- Always write cue descriptions in the voice of an on-site engineer or instructor
- Always reference a real industry standard in each cue description (API RP 53, IADC, OSHA 1910.119, ANSI/TIA-942, NFPA 75, ASHRAE A2, 49 CFR 192, etc.)
- Telemetry values must be realistic for the industry and event severity
- If the user mentions specific pressures, temperatures, or measurements — use them exactly
- The videoSearchQuery should find a real YouTube training video covering this exact topic
- Generate between 1 and 5 cues — never more than 5
`.trim();

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Parses a professional's free-form scenario description into a structured
 * Dexaview scenario configuration.
 *
 * @param {string} rawText   - The professional's plain-English description
 * @param {string} apiKey    - OpenAI API key (VITE_OPENAI_API_KEY)
 * @returns {Promise<{ok: boolean, scenario?: object, error?: string}>}
 */
export async function parseScenarioText(rawText, apiKey) {
  if (!apiKey) {
    return { ok: false, error: "OpenAI API key not set. Add VITE_OPENAI_API_KEY to your Railway environment variables." };
  }

  if (!rawText?.trim()) {
    return { ok: false, error: "Please describe your scenario before parsing." };
  }

  let raw;
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.2,
        max_tokens: 1200,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user",   content: rawText.trim() },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { ok: false, error: `OpenAI error: ${err?.error?.message ?? response.statusText}` };
    }

    const data = await response.json();
    raw = data.choices?.[0]?.message?.content?.trim();
  } catch (e) {
    return { ok: false, error: `Network error: ${e.message}` };
  }

  // Parse and validate the JSON
  let parsed;
  try {
    // Strip markdown code fences if the model included them despite instructions
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return { ok: false, error: "AI returned an invalid response. Please rephrase your description and try again." };
  }

  // Sanitise — clamp values to valid enum sets
  parsed.industryMode = VALID_INDUSTRY_MODES.includes(parsed.industryMode)
    ? parsed.industryMode
    : "oil_gas";

  if (!Array.isArray(parsed.cues)) parsed.cues = [];

  parsed.cues = parsed.cues.slice(0, 5).map((cue) => ({
    time:        typeof cue.time === "string" ? cue.time : "01:00",
    eventName:   VALID_EVENT_TYPES.includes(cue.eventName) ? cue.eventName : "blowout",
    description: typeof cue.description === "string" ? cue.description : "",
    telemetry: {
      pressure: cue.telemetry?.pressure ?? "",
      temp:     cue.telemetry?.temp     ?? "",
      status:   VALID_STATUSES.includes(cue.telemetry?.status)
                  ? cue.telemetry.status
                  : "WARNING",
    },
  }));

  return { ok: true, scenario: parsed };
}
