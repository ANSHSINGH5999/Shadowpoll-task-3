"use client";

import { useEffect, useState } from "react";

/**
 * Tracks `prefers-reduced-motion`. Starts at the SSR-safe default (reduced)
 * and updates once mounted — these hooks read browser-only APIs
 * (`matchMedia`, WebGL context) that don't exist during server rendering,
 * so a post-mount effect is the correct, hydration-safe way to pick up the
 * real value rather than deriving it during render.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from a browser-only API on mount
    setReduced(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/** Best-effort WebGL availability check, run once on mount (client only). */
export function useWebGLAvailable(): boolean | null {
  const [available, setAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    let gl: RenderingContext | null = null;
    try {
      const canvas = document.createElement("canvas");
      gl = canvas.getContext("webgl2") || canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    } catch {
      gl = null;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from a browser-only API on mount
    setAvailable(Boolean(gl));
  }, []);
  return available;
}

/** Coarse viewport-width tier, used to scale scene complexity down on small screens. */
export function useIsCompactViewport(): boolean {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 640px)");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from a browser-only API on mount
    setCompact(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setCompact(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return compact;
}
