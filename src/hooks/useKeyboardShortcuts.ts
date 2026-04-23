import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppCommands } from "@/app/AppCommands";

const CHORD_WINDOW_MS = 1000;

function isEditingTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  if (target.closest('[contenteditable="true"]')) return true;
  if (target.closest(".ant-select-selector")) return true;
  if (target.closest(".ant-input")) return true;
  if (target.closest(".ant-picker-input")) return true;
  // cmdk input
  if (target.closest("[cmdk-input]")) return true;
  return false;
}

interface Options {
  onOpenHelp: () => void;
}

export function useKeyboardShortcuts({ onOpenHelp }: Options) {
  const navigate = useNavigate();
  const location = useLocation();
  const { openEditor, openPalette, focusSearchRef } = useAppCommands();
  const chordTimer = useRef<number | null>(null);
  const chordPrefix = useRef<string | null>(null);

  // Track latest location so async / chord handlers use fresh values
  const locationRef = useRef(location);
  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    const clearChord = () => {
      if (chordTimer.current) {
        window.clearTimeout(chordTimer.current);
        chordTimer.current = null;
      }
      chordPrefix.current = null;
    };

    const handleKey = (e: KeyboardEvent) => {
      // Always-active: Cmd/Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openPalette("navigation");
        return;
      }
      // Cmd/Ctrl+P as secondary alias — only if not inside an editable (let paste through)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "p" && !isEditingTarget(e.target)) {
        e.preventDefault();
        openPalette("navigation");
        return;
      }
      // Always-active: Shift+/  (which is `?`)
      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        // Note: "?" requires Shift. Allow regardless of editing target? Spec says
        // "? (which requires shift) can fire regardless". Yes — fire regardless.
        e.preventDefault();
        onOpenHelp();
        return;
      }

      // Beyond this point, require no modifiers
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Single-letter shortcuts must NOT fire inside editable surfaces
      if (isEditingTarget(e.target)) return;

      // Chord handling: if we're waiting for the second key after "g"
      if (chordPrefix.current === "g") {
        const k = e.key.toLowerCase();
        if (k === "d") {
          e.preventDefault();
          navigate("/");
        } else if (k === "p") {
          e.preventDefault();
          navigate("/projects");
        } else if (k === "i") {
          e.preventDefault();
          navigate("/inbox");
        }
        // Any key (recognized or not) ends the chord
        clearChord();
        return;
      }

      const k = e.key;

      if (k === "n") {
        e.preventDefault();
        openEditor(null);
        return;
      }
      if (k === "/") {
        e.preventDefault();
        if (locationRef.current.pathname === "/content") {
          // On ContentList: focus the registered search input
          focusSearchRef.current?.();
        } else {
          navigate("/content");
          // Defer focus until ContentList mounts and registers its focus fn
          const start = Date.now();
          const tryFocus = () => {
            if (focusSearchRef.current) {
              focusSearchRef.current();
            } else if (Date.now() - start < 1500) {
              window.setTimeout(tryFocus, 40);
            }
          };
          window.setTimeout(tryFocus, 40);
        }
        return;
      }
      if (k === "c") {
        e.preventDefault();
        navigate("/calendar");
        return;
      }
      if (k === "g") {
        e.preventDefault();
        chordPrefix.current = "g";
        chordTimer.current = window.setTimeout(clearChord, CHORD_WINDOW_MS);
        return;
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
      clearChord();
    };
  }, [navigate, openEditor, openPalette, focusSearchRef, onOpenHelp]);
}
