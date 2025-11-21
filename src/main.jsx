import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./Homepage.css";
import { getSettings } from "./services/api";
import { applyTheme } from "./theme/applyTheme";

(async () => {
    try {
        const s = await getSettings();
        applyTheme(s?.theme); // เซ็ต class บน body ก่อน mount
    } catch { /* empty */ }
    ReactDOM.createRoot(document.getElementById("root")).render(<App />);
})();
