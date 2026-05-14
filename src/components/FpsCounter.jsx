/**
 * FpsCounter.jsx
 * src/components/FpsCounter.jsx
 */
import "./FpsCounter.css";

export default function FpsCounter({ fps }) {
  const tier = fps >= 55 ? "good" : fps >= 30 ? "warn" : "bad";

  return (
    <div className={`fps-counter fps-counter--${tier}`}>
      <span className="fps-counter__value">{fps}</span>
      <span className="fps-counter__label">FPS</span>
    </div>
  );
}
