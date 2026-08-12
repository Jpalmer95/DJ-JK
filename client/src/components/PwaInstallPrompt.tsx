import { useEffect, useState } from "react";
import type { BeforeInstallPromptEvent } from "@/lib/pwa";
import { isStandalone } from "@/lib/pwa";

// Phase 4 PWA polish: a self-contained overlay that (a) offers an "Install app"
// button when Chromium fires beforeinstallprompt and (b) shows an "Offline ready"
// pill when the network drops. Fixed-position — does not depend on page layout.
export default function PwaInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (isStandalone()) return; // already installed — nothing to offer

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setDeferred(null);
    const onOffline = () => setOffline(true);
    const onOnline = () => setOffline(false);

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        alignItems: "flex-end",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {offline && (
        <div
          style={{
            background: "rgba(13,13,20,0.9)",
            color: "#4ade80",
            border: "1px solid #4ade80",
            borderRadius: 999,
            padding: "6px 14px",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          ● Offline ready
        </div>
      )}
      {deferred && (
        <button
          onClick={handleInstall}
          style={{
            background: "linear-gradient(135deg,#6d28d9,#22d3ee)",
            color: "#fff",
            border: "none",
            borderRadius: 999,
            padding: "10px 18px",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(109,40,217,0.5)",
          }}
        >
          + Install DJ-JK
        </button>
      )}
    </div>
  );
}
