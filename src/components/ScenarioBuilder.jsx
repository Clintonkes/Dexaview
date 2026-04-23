/**
 * ScenarioBuilder.jsx
 * -------------------
 * Pre-simulation configuration screen. Users describe the scenario they want
 * to run — industry mode, YouTube video, cue points with plain-English event
 * descriptions, and telemetry starting values — before the simulation loads.
 *
 * On submit, the config is saved to localStorage and the user is routed to
 * SimLinkPage which reads it on mount.
 */

import { useState, useCallback } from "react";
import { SAMPLE_SCENARIOS, scenarioToFormState } from "../data/sampleScenarios";
import "./ScenarioBuilder.css";

const INDUSTRY_MODES = [
  { value: "oil_gas",      label: "Oil & Gas" },
  { value: "data_center",  label: "Data Center" },
  { value: "pipeline",     label: "Pipeline" },
  { value: "offshore",     label: "Offshore Platform" },
  { value: "manufacturing",label: "Manufacturing" },
];

const EVENT_TYPES = [
  { value: "blowout",        label: "Blowout / Explosion" },
  { value: "collapse",       label: "Structural Collapse" },
  { value: "fire",           label: "Fire / Thermal Event" },
  { value: "flood",          label: "Flood / Liquid Release" },
  { value: "pressure_spike", label: "Pressure Spike" },
];

const STATUS_OPTIONS = ["NOMINAL", "WARNING", "CRITICAL", "EMERGENCY"];

const EMPTY_CUE = {
  time: "",
  eventName: "blowout",
  description: "",
  telemetry: { pressure: "", temp: "", status: "NOMINAL" },
};

// Extract YouTube video ID from a full URL or bare ID
function extractVideoId(input) {
  const match = input.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  return match ? match[1] : input.trim();
}

// Convert "mm:ss" or bare seconds string to a number
function parseTime(str) {
  if (!str) return 0;
  const parts = str.split(":").map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number(parts[0]) || 0;
}

export default function ScenarioBuilder({ onStart }) {
  const [videoInput, setVideoInput]       = useState("");
  const [industry, setIndustry]           = useState("oil_gas");
  const [title, setTitle]                 = useState("");
  const [description, setDescription]     = useState("");
  const [cues, setCues]                   = useState([{ ...EMPTY_CUE }]);
  const [errors, setErrors]               = useState({});
  const [activeCategory, setActiveCategory] = useState("all");

  const CATEGORIES = ["all", "Oil & Gas", "Data Center", "Education — STEM", "Education — Vocational"];

  const visibleSamples = activeCategory === "all"
    ? SAMPLE_SCENARIOS
    : SAMPLE_SCENARIOS.filter((s) => s.category === activeCategory);

  const loadSample = useCallback((scenario) => {
    const state = scenarioToFormState(scenario);
    setVideoInput(state.videoInput);
    setIndustry(state.industry);
    setTitle(state.title);
    setDescription(state.description);
    setCues(state.cues);
    setErrors({});
    // Scroll form into view
    document.querySelector(".scenario-builder__form")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // -------------------------------------------------------------------------
  // Cue management
  // -------------------------------------------------------------------------

  const updateCue = useCallback((index, field, value) => {
    setCues((prev) => {
      const next = [...prev];
      if (field.startsWith("telemetry.")) {
        const key = field.split(".")[1];
        next[index] = {
          ...next[index],
          telemetry: { ...next[index].telemetry, [key]: value },
        };
      } else {
        next[index] = { ...next[index], [field]: value };
      }
      return next;
    });
  }, []);

  const addCue = useCallback(() => {
    setCues((prev) => [...prev, { ...EMPTY_CUE }]);
  }, []);

  const removeCue = useCallback((index) => {
    setCues((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // -------------------------------------------------------------------------
  // Validation & submit
  // -------------------------------------------------------------------------

  const validate = useCallback(() => {
    const errs = {};
    if (!videoInput.trim()) errs.video = "YouTube URL or video ID is required.";
    if (!title.trim()) errs.title = "Scenario title is required.";
    cues.forEach((cue, i) => {
      if (!cue.time) errs[`cue_${i}_time`] = "Timestamp required.";
      if (!cue.description.trim()) errs[`cue_${i}_desc`] = "Event description required.";
    });
    return errs;
  }, [videoInput, title, cues]);

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      const errs = validate();
      if (Object.keys(errs).length > 0) {
        setErrors(errs);
        return;
      }
      setErrors({});

      const config = {
        videoId: extractVideoId(videoInput),
        industryMode: industry,
        title: title.trim(),
        description: description.trim(),
        cues: cues.map((c) => ({
          time:        parseTime(c.time),
          eventName:   c.eventName,
          description: c.description.trim(),
          telemetry:   c.telemetry,
        })),
      };

      localStorage.setItem("dexaview_scenario", JSON.stringify(config));
      onStart(config);
    },
    [validate, videoInput, industry, title, description, cues, onStart]
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="scenario-builder">
      <header className="scenario-builder__header">
        <h1 className="scenario-builder__title">DEXAVIEW</h1>
        <p className="scenario-builder__subtitle">Configure Your Industrial Simulation</p>
      </header>

      {/* -------------------------------------------------------------------- */}
      {/* Sample Scenario Library                                               */}
      {/* -------------------------------------------------------------------- */}
      <div className="scenario-builder__samples-wrap">
        <div className="scenario-builder__samples-header">
          <span className="scenario-builder__samples-title">SAMPLE SCENARIOS — Load to test immediately</span>
          <div className="scenario-builder__category-tabs">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`scenario-builder__cat-tab ${activeCategory === cat ? "scenario-builder__cat-tab--active" : ""}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat === "all" ? "All" : cat}
              </button>
            ))}
          </div>
        </div>

        <div className="scenario-builder__samples-grid">
          {visibleSamples.map((s) => (
            <div key={s.id} className="scenario-builder__sample-card">
              <div className="scenario-builder__sample-category">{s.category}</div>
              <div className="scenario-builder__sample-label">{s.label}</div>
              <div className="scenario-builder__sample-desc">{s.description_short}</div>
              <div className="scenario-builder__sample-meta">
                {s.cues.length} event{s.cues.length !== 1 ? "s" : ""} · {s.standards.slice(0, 2).join(" · ")}
              </div>
              <button
                type="button"
                className="scenario-builder__sample-load-btn"
                onClick={() => loadSample(s)}
              >
                Load This Scenario ↓
              </button>
            </div>
          ))}
        </div>

        <p className="scenario-builder__samples-note">
          ⚠ Sample scenarios use placeholder video IDs. Replace the Video ID field
          with a real YouTube video ID before launching. See the Sources Guide below
          for recommended videos for each scenario.
        </p>
      </div>

      <form className="scenario-builder__form" onSubmit={handleSubmit}>

        {/* ---------------------------------------------------------------- */}
        {/* Section 1 — Video & Industry                                      */}
        {/* ---------------------------------------------------------------- */}
        <section className="scenario-builder__section">
          <h2 className="scenario-builder__section-title">1. Video & Industry</h2>

          <label className="scenario-builder__label">
            YouTube Video URL or Video ID
            <input
              className={`scenario-builder__input ${errors.video ? "scenario-builder__input--error" : ""}`}
              type="text"
              placeholder="https://youtube.com/watch?v=... or just the video ID"
              value={videoInput}
              onChange={(e) => setVideoInput(e.target.value)}
            />
            {errors.video && <span className="scenario-builder__error">{errors.video}</span>}
          </label>

          <label className="scenario-builder__label">
            Industry Mode
            <select
              className="scenario-builder__select"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
            >
              {INDUSTRY_MODES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <span className="scenario-builder__hint">
              This determines which safety standards the AI advisor cites (API RP 53 for Oil & Gas, ANSI/TIA-942 for Data Center, etc.)
            </span>
          </label>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Section 2 — Scenario Description                                 */}
        {/* ---------------------------------------------------------------- */}
        <section className="scenario-builder__section">
          <h2 className="scenario-builder__section-title">2. Scenario Description</h2>

          <label className="scenario-builder__label">
            Scenario Title
            <input
              className={`scenario-builder__input ${errors.title ? "scenario-builder__input--error" : ""}`}
              type="text"
              placeholder="e.g. Deepwater BOP Failure — Hurricane Conditions"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            {errors.title && <span className="scenario-builder__error">{errors.title}</span>}
          </label>

          <label className="scenario-builder__label">
            Scenario Context (shown to users before the simulation starts)
            <textarea
              className="scenario-builder__textarea"
              rows={4}
              placeholder="Describe the situation in plain English. What industrial scenario is this? What are the stakes? What has gone wrong?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Section 3 — Cue Points                                           */}
        {/* ---------------------------------------------------------------- */}
        <section className="scenario-builder__section">
          <h2 className="scenario-builder__section-title">3. Simulation Events</h2>
          <p className="scenario-builder__section-hint">
            Each event is tied to a timestamp in your video. When the video reaches that moment,
            the physics event fires in the simulation and this description appears on screen.
          </p>

          {cues.map((cue, i) => (
            <div key={i} className="scenario-builder__cue">
              <div className="scenario-builder__cue-header">
                <span className="scenario-builder__cue-label">Event {i + 1}</span>
                {cues.length > 1 && (
                  <button
                    type="button"
                    className="scenario-builder__remove-btn"
                    onClick={() => removeCue(i)}
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="scenario-builder__cue-row">
                <label className="scenario-builder__label scenario-builder__label--small">
                  Timestamp (mm:ss)
                  <input
                    className={`scenario-builder__input ${errors[`cue_${i}_time`] ? "scenario-builder__input--error" : ""}`}
                    type="text"
                    placeholder="01:30"
                    value={cue.time}
                    onChange={(e) => updateCue(i, "time", e.target.value)}
                  />
                  {errors[`cue_${i}_time`] && (
                    <span className="scenario-builder__error">{errors[`cue_${i}_time`]}</span>
                  )}
                </label>

                <label className="scenario-builder__label scenario-builder__label--small">
                  Event Type
                  <select
                    className="scenario-builder__select"
                    value={cue.eventName}
                    onChange={(e) => updateCue(i, "eventName", e.target.value)}
                  >
                    {EVENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="scenario-builder__label">
                Event Description (shown on screen when event fires)
                <textarea
                  className={`scenario-builder__textarea ${errors[`cue_${i}_desc`] ? "scenario-builder__input--error" : ""}`}
                  rows={3}
                  placeholder="e.g. BOP rams fail to close. Well flow detected at surface. Immediate well kill required per API RP 53 Section 7."
                  value={cue.description}
                  onChange={(e) => updateCue(i, "description", e.target.value)}
                />
                {errors[`cue_${i}_desc`] && (
                  <span className="scenario-builder__error">{errors[`cue_${i}_desc`]}</span>
                )}
              </label>

              <div className="scenario-builder__telemetry">
                <span className="scenario-builder__telemetry-title">Telemetry at this event:</span>
                <div className="scenario-builder__cue-row">
                  <label className="scenario-builder__label scenario-builder__label--small">
                    Pressure
                    <input
                      className="scenario-builder__input"
                      type="text"
                      placeholder="e.g. 8,500 psi"
                      value={cue.telemetry.pressure}
                      onChange={(e) => updateCue(i, "telemetry.pressure", e.target.value)}
                    />
                  </label>
                  <label className="scenario-builder__label scenario-builder__label--small">
                    Temperature
                    <input
                      className="scenario-builder__input"
                      type="text"
                      placeholder="e.g. 142°C"
                      value={cue.telemetry.temp}
                      onChange={(e) => updateCue(i, "telemetry.temp", e.target.value)}
                    />
                  </label>
                  <label className="scenario-builder__label scenario-builder__label--small">
                    Status
                    <select
                      className="scenario-builder__select"
                      value={cue.telemetry.status}
                      onChange={(e) => updateCue(i, "telemetry.status", e.target.value)}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            </div>
          ))}

          <button type="button" className="scenario-builder__add-btn" onClick={addCue}>
            + Add Another Event
          </button>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Submit                                                            */}
        {/* ---------------------------------------------------------------- */}
        <button type="submit" className="scenario-builder__submit-btn">
          LAUNCH SIMULATION →
        </button>
      </form>
    </div>
  );
}
