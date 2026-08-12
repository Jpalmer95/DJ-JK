// PWA bootstrapping (Phase 1): register the service worker + sync PWA install
// availability so the UI can show an "Install app / Offline ready" affordance.

export function registerPWA(): void {
  if (typeof navigator === "undefined") return;

  if ("serviceWorker" in navigator) {
    // Defer registration until the page is idle so it never blocks first paint.
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("DJ-JK: service worker registration failed", err);
      });
    };
    if ("requestIdleCallback" in window) {
      const ric = (window as unknown as {
        requestIdleCallback: (cb: () => void) => void;
      }).requestIdleCallback;
      ric(register);
    } else {
      setTimeout(register, 800);
    }
  }
}

/** True once the app can run offline (SW controlling the page). */
export async function isOfflineReady(): Promise<boolean> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return false;
  const reg = await navigator.serviceWorker.getRegistration();
  return !!(reg && (reg.active || reg.waiting));
}
