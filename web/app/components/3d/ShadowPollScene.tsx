"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PrivacyCore } from "./PrivacyCore";
import { VoterNode } from "./VoterNode";
import { PublicLedgerPanel } from "./PublicLedgerPanel";
import { NullifierField } from "./NullifierField";
import { StreamParticles } from "./Particles";
import type { PublicPollState } from "./types";

type ShadowPollSceneProps = {
  state: PublicPollState;
  reducedMotion: boolean;
  compact: boolean;
};

const YES_COLOR = "#3987e5";
const NO_COLOR = "#d95926";

export function ShadowPollScene({ state, reducedMotion, compact }: ShadowPollSceneProps) {
  const rootRef = useRef<THREE.Group>(null);

  useFrame((frameState) => {
    if (reducedMotion || !rootRef.current) return;
    const { x, y } = frameState.pointer; // normalized [-1, 1], tracked over the canvas
    rootRef.current.rotation.y += (x * 0.15 - rootRef.current.rotation.y) * 0.04;
    rootRef.current.rotation.x += (-y * 0.08 - rootRef.current.rotation.x) * 0.04;
  });

  const dim = state.status === "indexer-offline";
  const paused = reducedMotion;
  const particleCount = compact ? 40 : 90;

  const total = Math.max(state.totalVotes, 1);
  const yesIntensity = state.totalVotes === 0 ? 0.25 : state.yesVotes / total;
  const noIntensity = state.totalVotes === 0 ? 0.25 : state.noVotes / total;

  return (
    <group ref={rootRef}>
      <ambientLight intensity={0.35} color="#4a3aa7" />
      <pointLight position={[2, 2, 3]} intensity={dim ? 20 : 45} color="#3987e5" distance={8} />
      <pointLight position={[-2, -1, -2]} intensity={dim ? 8 : 18} color="#9085e9" distance={8} />

      <group position={[-2.1, 0, 0]}>
        <VoterNode paused={paused} />
      </group>

      <group position={[0, 0, 0]}>
        <PrivacyCore paused={paused} dim={dim} particleCount={particleCount} />
      </group>

      <group position={[1.5, -0.1, 0]} scale={0.85}>
        <NullifierField count={state.nullifierCount} paused={paused} />
      </group>

      <group position={[2.3, 0, 0]} scale={0.9}>
        <PublicLedgerPanel totalVotes={state.totalVotes} paused={paused} />
      </group>

      {/* Yes path: core -> upper right toward the ledger */}
      <StreamParticles
        count={compact ? 10 : 18}
        from={[0.4, 0.25, 0]}
        to={[2.1, 0.28, 0]}
        color={YES_COLOR}
        intensity={dim ? 0 : yesIntensity}
        paused={paused}
      />
      {/* No path: core -> lower right toward the ledger */}
      <StreamParticles
        count={compact ? 10 : 18}
        from={[0.4, -0.25, 0]}
        to={[2.1, -0.28, 0]}
        color={NO_COLOR}
        intensity={dim ? 0 : noIntensity}
        paused={paused}
      />
      {/* voter -> core: the private signal, always faint/private-looking */}
      <StreamParticles
        count={compact ? 6 : 10}
        from={[-1.9, 0, 0]}
        to={[-0.6, 0, 0]}
        color="#5b5b6a"
        intensity={dim ? 0 : 0.5}
        speed={0.3}
        paused={paused}
      />
    </group>
  );
}
