// useSessionTimeout.js
// Auto-logout after IDLE_MINUTES of inactivity (OSAS admin only).
// Resets the timer on any mouse/keyboard/scroll/touch event.
import { useEffect, useRef, useCallback } from "react";

const IDLE_MINUTES = 15;
const WARNING_SECONDS = 60; // show warning 1 min before logout

export function useSessionTimeout(onTimeout, onWarning, enabled = true) {
  const timer = useRef(null);
  const warnTimer = useRef(null);

  const reset = useCallback(() => {
    if (!enabled) return;
    clearTimeout(timer.current);
    clearTimeout(warnTimer.current);
    warnTimer.current = setTimeout(() => {
      onWarning && onWarning();
    }, (IDLE_MINUTES * 60 - WARNING_SECONDS) * 1000);
    timer.current = setTimeout(() => {
      onTimeout();
    }, IDLE_MINUTES * 60 * 1000);
  }, [enabled, onTimeout, onWarning]);

  useEffect(() => {
    if (!enabled) return;
    const events = ["mousemove","mousedown","keydown","scroll","touchstart","click"];
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      events.forEach(e => window.removeEventListener(e, reset));
      clearTimeout(timer.current);
      clearTimeout(warnTimer.current);
    };
  }, [reset, enabled]);
}
