import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ThemeProvider } from "next-themes";
import { registerPWA } from "./lib/pwa";
import PwaInstallPrompt from "./components/PwaInstallPrompt";

// Phase 1: make the studio installable + offline-capable.
registerPWA();

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="light">
    <App />
    <PwaInstallPrompt />
  </ThemeProvider>
);
