/**
 * SimLinkPage.jsx
 * ---------------
 * The primary Dexaview interface. It renders three panels side-by-side:
 *
 *   ┌─────────────────────┬──────────────────────┬────────────────┐
 *   │  YouTube Player      │  3D Simulation       │  AI Advisor    │
 *   │  (left column)       │  (centre, dominant)  │  (right panel) │
 *   └─────────────────────┴──────────────────────┴────────────────┘
 *
 * Data flows:
 *   YouTube time → useSimLink → engine.triggerPhysicsEvent()
 *   3D object click → seekVideo(timestamp)
 *   User text input → engine.askAdvisor() → AI response panel
 *
 * The component manages the full DexaviewEngine lifecycle: it creates the engine
 * on mount, tears it down on unmount, and forwards DOM events to React state.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { DexaviewEngine } from "../engine/DexaviewEngine";
import { useSimLink } from "../hooks/useSimLink";
import AdvisorPanel from "./AdvisorPanel";
import FpsCounter from "./FpsCounter";
import "./SimLinkPage.css";

// ---------------------------------------------------------------------------
// Demo configuration
// ---------------------------------------------------------------------------

/**
 * Registered cue points for the demo video.
 * Change the videoId and these timestamps to match your own content.
 */
const DEMO_VIDEO_ID = "REPLACE_WITH_YOUR_YOUTUBE_VIDEO_ID";

const DEMO_CUES = [
  {
    time: 90,       // 1 min 30 sec
    eventName: "blowout",
    origin: new THREE.Vector3(0, 0, 0),
  },
  {
    time: 240,      // 4 min 0 sec
    eventName: "collapse",
    origin: new THREE.Vector3(0, 5, 0),
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SimLinkPage() {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);

  const [advisorMessages, setAdvisorMessages] = useState([]);
  const [advisorInput, setAdvisorInput] = useState("");
  const [fps, setFps] = useState(0);
  const [activeEvent, setActiveEvent] = useState(null);

  // -------------------------------------------------------------------------
  // Engine lifecycle
  // -------------------------------------------------------------------------

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new DexaviewEngine(canvas, {
      openAiApiKey: import.meta.env.VITE_OPENAI_API_KEY,
      industryMode: "oil_gas",
    });

    engineRef.current = engine;

    engine.init().then(() => {
      engine.start();

      // Load the demo drilling rig asset once the engine is ready
      engine.loadAsset(
        "/assets/drilling_rig.glb",
        { position: new THREE.Vector3(0, 0, 0), scale: new THREE.Vector3(1, 1, 1) },
        true
      );
    });

    // -----------------------------------------------------------------------
    // DOM event listeners forwarded to React state
    // -----------------------------------------------------------------------

    const handleAiResponse = ({ detail }) => {
      setAdvisorMessages((prev) => [...prev, detail]);
    };

    const handleFpsUpdate = ({ detail }) => {
      setFps(detail.fps);
    };

    const handlePhysicsEvent = ({ detail }) => {
      setActiveEvent(detail.eventName);
      // Clear the event badge after 3 seconds
      setTimeout(() => setActiveEvent(null), 3000);
    };

    canvas.addEventListener("dexaview:ai-response", handleAiResponse);
    canvas.addEventListener("dexaview:fps-update", handleFpsUpdate);
    canvas.addEventListener("dexaview:physics-event", handlePhysicsEvent);

    return () => {
      canvas.removeEventListener("dexaview:ai-response", handleAiResponse);
      canvas.removeEventListener("dexaview:fps-update", handleFpsUpdate);
      canvas.removeEventListener("dexaview:physics-event", handlePhysicsEvent);
      engine.dispose();
    };
  }, []);

  // -------------------------------------------------------------------------
  // Sim-Link
  // -------------------------------------------------------------------------

  const { addCue, seekVideo } = useSimLink(engineRef, {
    videoId: DEMO_VIDEO_ID,
    onCueTriggered: (cue) => {
      // When a cue fires, automatically ask the advisor about the event
      engineRef.current?.askAdvisor(
        `A "${cue.eventName}" event has just been triggered at simulation time ${cue.time}s. What is the immediate response procedure?`
      );
    },
  });

  // Register demo cues once on mount
  useEffect(() => {
    DEMO_CUES.forEach(addCue);
  }, [addCue]);

  // -------------------------------------------------------------------------
  // UI handlers
  // -------------------------------------------------------------------------

  const handleAdvisorSubmit = useCallback(
    (e) => {
      e.preventDefault();
      if (!advisorInput.trim()) return;

      // Optimistically append the user message to the panel
      setAdvisorMessages((prev) => [
        ...prev,
        { role: "user", content: advisorInput, timestamp: Date.now() },
      ]);

      engineRef.current?.askAdvisor(advisorInput);
      setAdvisorInput("");
    },
    [advisorInput]
  );

  const handleManualEvent = useCallback(
    (eventName) => {
      engineRef.current?.triggerPhysicsEvent(
        eventName,
        new THREE.Vector3(0, 0, 0)
      );
    },
    []
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="simlink-page">
      {/* ------------------------------------------------------------------ */}
      {/* Left – YouTube Player                                                */}
      {/* ------------------------------------------------------------------ */}
      <section className="simlink-page__youtube">
        <header className="simlink-page__panel-header">
          <span className="simlink-page__panel-label">SIM-LINK FEED</span>
        </header>

        {/* The YouTube IFrame API replaces this div with an <iframe> */}
        <div id="dexaview-yt-player" className="simlink-page__yt-frame" />

        {/* Quick-seek buttons for demo timestamps */}
        <div className="simlink-page__seek-controls">
          {DEMO_CUES.map((cue) => (
            <button
              key={cue.time}
              className="simlink-page__seek-btn"
              onClick={() => seekVideo(cue.time)}
            >
              ⏩ {cue.eventName} @ {cue.time}s
            </button>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Centre – 3D Simulation Canvas                                        */}
      {/* ------------------------------------------------------------------ */}
      <section className="simlink-page__canvas-wrap">
        <canvas ref={canvasRef} className="simlink-page__canvas" />

        {/* HUD overlays */}
        <FpsCounter fps={fps} />

        {activeEvent && (
          <div className="simlink-page__event-badge">
            ⚡ {activeEvent.toUpperCase()} TRIGGERED
          </div>
        )}

        {/* Manual trigger controls for testing without a video */}
        <div className="simlink-page__trigger-row">
          <button
            className="simlink-page__trigger-btn simlink-page__trigger-btn--danger"
            onClick={() => handleManualEvent("blowout")}
          >
            TRIGGER BLOWOUT
          </button>
          <button
            className="simlink-page__trigger-btn"
            onClick={() => handleManualEvent("collapse")}
          >
            TRIGGER COLLAPSE
          </button>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Right – AI Technical Advisor                                         */}
      {/* ------------------------------------------------------------------ */}
      <section className="simlink-page__advisor">
        <AdvisorPanel
          messages={advisorMessages}
          inputValue={advisorInput}
          onInputChange={(e) => setAdvisorInput(e.target.value)}
          onSubmit={handleAdvisorSubmit}
        />
      </section>
    </div>
  );
}
