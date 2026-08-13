"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { showError } from "@/utils/toast";

// Auto-logout after this many milliseconds of no user activity.
const IDLE_LIMIT_MS = 10 * 60 * 1000; // 10 minutes

// Pages where an idle logout doesn't make sense (nobody is "logged in" yet).
const EXCLUDED_PATH_PREFIXES = ["/signin", "/join"];

/**
 * Watches for user activity (mouse, keyboard, touch, scroll) anywhere in the
 * app and, if the person has been inactive for IDLE_LIMIT_MS while a session
 * token exists, clears the session and redirects to sign-in. Applies to every
 * role (admin, recruiter, referrer, candidate) since it only cares whether a
 * token is present in localStorage, not which role owns it.
 */
export default function IdleLogout() {
  const router = useRouter();
  const timerRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isExcludedPath = () =>
      EXCLUDED_PATH_PREFIXES.some(p => window.location.pathname.startsWith(p));

    const logout = () => {
      if (!localStorage.getItem("token")) return; // nobody logged in — nothing to do
      if (isExcludedPath()) return;
      localStorage.removeItem("token");
      showError("You've been signed out due to inactivity.");
      window.location.href = "/signin";
    };

    const resetTimer = () => {
      if (isExcludedPath()) return;
      if (!localStorage.getItem("token")) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(logout, IDLE_LIMIT_MS);
    };

    const activityEvents = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];
    activityEvents.forEach(evt => window.addEventListener(evt, resetTimer, { passive: true }));

    resetTimer();

    return () => {
      activityEvents.forEach(evt => window.removeEventListener(evt, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [router]);

  return null;
}
