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
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#08080a] via-[#111116] to-[#0d0d1a]">
      <div className="flex items-center gap-6 opacity-80">
        <div className="h-10 w-10 rounded-full border border-[#3987e5]/60" />
        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[#4a3aa7] to-[#3987e5] blur-[1px]" />
        <div className="h-10 w-16 rounded-md border border-[#9085e9]/40" />
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
      className="relative h-[280px] w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[#08080a] sm:h-[360px]"
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

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between px-4 pb-3 text-[10px] uppercase tracking-wide text-[var(--muted)]">
        <span>Private witness</span>
        <span>{state.status === "indexer-offline" ? "Disconnected" : "Privacy core"}</span>
        <span>Public ledger</span>
      </div>
    </div>
  );
}
