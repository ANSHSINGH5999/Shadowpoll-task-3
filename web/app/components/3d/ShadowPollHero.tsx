"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { ShadowPollScene } from "./ShadowPollScene";
import { usePrefersReducedMotion, useWebGLAvailable, useIsCompactViewport } from "./hooks";
import type { PublicPollState } from "./types";

type ShadowPollHeroProps = {
  state: PublicPollState;
};

function StaticFallback({ state }: { state: PublicPollState }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#050505] via-[#0b0b0c] to-[#0f0d1a]">
      <div className="flex items-center gap-6 opacity-80">
        <div className="h-10 w-10 rounded-full border border-[var(--accent)]/50" />
        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[var(--accent-dim)] to-[var(--accent)] blur-[1px]" />
        <div className="h-10 w-16 rounded-md border border-[var(--accent)]/30" />
      </div>
      <span className="sr-only">
        {state.status === "indexer-offline"
          ? "Privacy visualization unavailable — live data disconnected."
          : "Privacy visualization: private vote flowing into a public tally."}
      </span>
    </div>
  );
}

/**
 * Decorative 3D visualization of ShadowPoll's privacy model. This is purely
 * supplementary — every number it reflects (yes/no/total/nullifiers) is
 * already rendered as accessible HTML elsewhere on the page, so the canvas
 * is marked presentational and safe to hide from assistive tech.
 */
export function ShadowPollHero({ state }: ShadowPollHeroProps) {
  const reducedMotion = usePrefersReducedMotion();
  const webglAvailable = useWebGLAvailable();
  const compact = useIsCompactViewport();

  const showCanvas = webglAvailable !== false;

  return (
    <div
      role="presentation"
      aria-hidden="true"
      className="relative h-[380px] w-full overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[#050505] sm:h-[480px]"
    >
      {showCanvas ? (
        <Suspense fallback={<StaticFallback state={state} />}>
          <Canvas
            dpr={[1, compact ? 1.5 : 2]}
            camera={{ position: [0, 0.3, 5.2], fov: 42 }}
            gl={{ antialias: true, alpha: true }}
          >
            <ShadowPollScene state={state} reducedMotion={reducedMotion} compact={compact} />
          </Canvas>
        </Suspense>
      ) : (
        <StaticFallback state={state} />
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between px-6 pb-5 text-[10px] tracking-[0.2em] text-[var(--muted-2)] uppercase sm:px-8">
        <span>Private witness</span>
        <span>{state.status === "indexer-offline" ? "Disconnected" : "Privacy core"}</span>
        <span>Public ledger</span>
      </div>
    </div>
  );
}
