/**
 * SimLinkPage.jsx
 * src/components/SimLinkPage.jsx
 */

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { DexaviewEngine } from "../engine/DexaviewEngine";
import { useSimLink } from "../hooks/useSimLink";
import AdvisorPanel from "./AdvisorPanel";
import FpsCounter from "./FpsCounter";
import "./SimLinkPage.css";

// Industry label map for top bar pill
const INDUSTRY_LABELS = {
  oil_gas:       "OIL & GAS",
  data_center:   "DATA CENTER",
  pipeline:      "PIPELINE",
  offshore:      "OFFSHORE",
  manufacturing: "MANUFACTURING",
};

export default function SimLinkPage({ scenario, onBack }) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);

  const [advisorMessages, setAdvisorMessages]   = useState([]);
  const [advisorInput, setAdvisorInput]         = useState("");
  const [isAdvisorLoading, setIsAdvisorLoading] = useState(false);
  const [fps, setFps]                           = useState(0);
  const [activeEvent, setActiveEvent]           = useState(null);
  const [activeEventDesc, setActiveEventDesc]   = useState(null);
  const [engineReady, setEngineReady]           = useState(false);

  const videoId = scenario?.videoId ?? "";
  const cueList = (scenario?.cues ?? []).map((c) => ({
    time:        c.time,
    eventName:   c.eventName,
    origin:      new THREE.Vector3(0, 0, 0),
    description: c.description,
    telemetry:   c.telemetry,
  }));

  const industryLabel = INDUSTRY_LABELS[scenario?.industryMode] ?? "SIMULATION";

  // -------------------------------------------------------------------------
  // Engine lifecycle
  // -------------------------------------------------------------------------

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new DexaviewEngine(canvas, {
      openAiApiKey: import.meta.env.VITE_OPENAI_API_KEY,
      industryMode: scenario?.industryMode ?? "oil_gas",
    });

    engineRef.current = engine;

    engine.init().then(() => {
      engine.start();
      setEngineReady(true);
      engine.loadAsset(
        "/assets/drilling_rig.glb",
        { position: new THREE.Vector3(0, 0, 0), scale: new THREE.Vector3(1, 1, 1) },
        true
      );
    }).catch(() => {
      engine.start();
      setEngineReady(true);
    });

    const handleAiResponse = ({ detail }) => {
      setIsAdvisorLoading(false);
      setAdvisorMessages((prev) => [...prev, detail]);
    };

    const handleFpsUpdate = ({ detail }) => setFps(detail.fps);

    const handlePhysicsEvent = ({ detail }) => {
      setActiveEvent(detail.eventName);
      const matched = cueList.find((c) => c.eventName === detail.eventName);
      if (matched?.description) setActiveEventDesc(matched.description);
      setTimeout(() => { setActiveEvent(null); setActiveEventDesc(null); }, 7000);
    };

    canvas.addEventListener("dexaview:ai-response",  handleAiResponse);
    canvas.addEventListener("dexaview:fps-update",   handleFpsUpdate);
    canvas.addEventListener("dexaview:physics-event", handlePhysicsEvent);

    return () => {
      canvas.removeEventListener("dexaview:ai-response",  handleAiResponse);
      canvas.removeEventListener("dexaview:fps-update",   handleFpsUpdate);
      canvas.removeEventListener("dexaview:physics-event", handlePhysicsEvent);
      engine.dispose();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // -------------------------------------------------------------------------
  // Sim-Link
  // -------------------------------------------------------------------------

  const { addCue, seekVideo } = useSimLink(engineRef, {
    videoId,
    onCueTriggered: (cue) => {
      const context = cue.description ? `Context: ${cue.description} ` : "";
      setIsAdvisorLoading(true);
      engineRef.current?.askAdvisor(
        `A "${cue.eventName}" event has just been triggered at ${cue.time}s. ${context}What is the immediate response procedure?`
      );
    },
  });

  useEffect(() => {
    cueList.forEach(addCue);
  }, [addCue]); // eslint-disable-line react-hooks/exhaustive-deps

  // -------------------------------------------------------------------------
  // UI handlers
  // -------------------------------------------------------------------------

  const handleAdvisorSubmit = useCallback((e) => {
    e.preventDefault();
    if (!advisorInput.trim() || isAdvisorLoading) return;
    setAdvisorMessages((prev) => [
      ...prev,
      { role: "user", content: advisorInput, timestamp: Date.now() },
    ]);
    setIsAdvisorLoading(true);
    engineRef.current?.askAdvisor(advisorInput);
    setAdvisorInput("");
  }, [advisorInput, isAdvisorLoading]);

  const handleManualEvent = useCallback((eventName) => {
    engineRef.current?.triggerPhysicsEvent(eventName, new THREE.Vector3(0, 0, 0));
  }, []);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="sl-page">

      {/* ------------------------------------------------------------------ */}
      {/* Top navigation bar                                                   */}
      {/* ------------------------------------------------------------------ */}
      <nav className="sl-topbar">
        <button className="sl-topbar__back" onClick={onBack} title="Back to Scenario Builder">
          ← BACK
        </button>

        <div className="sl-topbar__center">
          <span className="sl-topbar__logo dx-mono">DEXAVIEW</span>
          {scenario?.title && (
            <>
              <span className="sl-topbar__sep">/</span>
              <span className="sl-topbar__scenario-title">{scenario.title}</span>
            </>
          )}
        </div>

        <div className="sl-topbar__right">
          <span className={`sl-topbar__industry-pill sl-topbar__industry-pill--${scenario?.industryMode ?? "oil_gas"}`}>
            {industryLabel}
          </span>
          <span className={`sl-topbar__status ${engineReady ? "sl-topbar__status--live" : "sl-topbar__status--init"}`}>
            {engineReady ? "● LIVE" : "◌ INIT"}
          </span>
        </div>
      </nav>

      {/* ------------------------------------------------------------------ */}
      {/* Three-panel body                                                     */}
      {/* ------------------------------------------------------------------ */}
      <div className="sl-body">

        {/* LEFT — YouTube / Sim-Link feed */}
        <section className="sl-panel sl-panel--left">
          <header className="sl-panel__header">
            <span className="sl-panel__dot" />
            <span className="sl-panel__label dx-mono">SIM-LINK FEED</span>
          </header>

          <div id="dexaview-yt-player" className="sl-yt-frame" />

          <div className="sl-cue-list">
            <p className="sl-cue-list__heading dx-mono">CUE POINTS</p>
            {cueList.length === 0 && (
              <p className="sl-cue-list__empty">No cue points configured</p>
            )}
            {cueList.map((cue) => (
              <button
                key={cue.time}
                className="sl-cue-btn"
                onClick={() => seekVideo(cue.time)}
              >
                <span className="sl-cue-btn__time dx-mono">
                  {String(Math.floor(cue.time / 60)).padStart(2, "0")}:{String(cue.time % 60).padStart(2, "0")}
                </span>
                <span className="sl-cue-btn__event">{cue.eventName.replace("_", " ")}</span>
                <span className="sl-cue-btn__arrow">→</span>
              </button>
            ))}
          </div>
        </section>

        {/* CENTRE — 3D Simulation Canvas */}
        <section className="sl-canvas-wrap">
          <canvas ref={canvasRef} className="sl-canvas" />

          <FpsCounter fps={fps} />

          {/* Event alert overlay */}
          {activeEvent && (
            <div className="sl-event-alert" key={activeEvent}>
              <div className="sl-event-alert__pill dx-mono">
                ⚡ {activeEvent.replace("_", " ").toUpperCase()}
              </div>
              {activeEventDesc && (
                <p className="sl-event-alert__desc">{activeEventDesc}</p>
              )}
              <p className="sl-event-alert__cta">
                Ask the AI Advisor for the response procedure →
              </p>
            </div>
          )}

          {/* Manual trigger controls */}
          <div className="sl-trigger-row">
            <button
              className="sl-trigger-btn sl-trigger-btn--danger"
              onClick={() => handleManualEvent("blowout")}
            >
              TRIGGER BLOWOUT
            </button>
            <button
              className="sl-trigger-btn"
              onClick={() => handleManualEvent("collapse")}
            >
              TRIGGER COLLAPSE
            </button>
          </div>
        </section>

        {/* RIGHT — AI Technical Advisor */}
        <section className="sl-panel sl-panel--right">
          <AdvisorPanel
            messages={advisorMessages}
            inputValue={advisorInput}
            onInputChange={(e) => setAdvisorInput(e.target.value)}
            onSubmit={handleAdvisorSubmit}
            isLoading={isAdvisorLoading}
          />
        </section>

      </div>
    </div>
  );
}
