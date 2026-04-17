/**
 * main.jsx
 * --------
 * React application entry point.
 * Mounts the root component onto the #root div in index.html.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import SimLinkPage from "./components/SimLinkPage";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <SimLinkPage />
  </StrictMode>
);
