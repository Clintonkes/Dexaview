import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import ScenarioBuilder from "./components/ScenarioBuilder";
import SimLinkPage from "./components/SimLinkPage";
import "./index.css";

function App() {
  const [scenario, setScenario] = useState(null);

  if (!scenario) {
    return <ScenarioBuilder onStart={setScenario} />;
  }

  return <SimLinkPage scenario={scenario} />;
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
