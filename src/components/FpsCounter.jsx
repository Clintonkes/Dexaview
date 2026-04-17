/**
 * FpsCounter.jsx
 * --------------
 * Minimal HUD element that shows the current frames-per-second reading
 * received from DexaviewEngine via the "dexaview:fps-update" event.
 *
 * Colour coding:
 *   ≥ 55 fps  → accent green (nominal)
 *   30–54 fps → amber (acceptable)
 *   < 30 fps  → danger red (below target)
 *
 * Props:
 *   fps {number} – current frame rate
 */

export default function FpsCounter({ fps }) {
  const colour =
    fps >= 55 ? "#00ff88" : fps >= 30 ? "#ffaa00" : "#ff2d4a";

  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        right: 12,
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 11,
        letterSpacing: "0.1em",
        color: colour,
        background: "rgba(8,11,18,0.7)",
        padding: "3px 8px",
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      {fps} FPS
    </div>
  );
}
