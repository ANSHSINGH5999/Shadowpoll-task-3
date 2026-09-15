"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

type PublicLedgerPanelProps = {
  totalVotes: number;
  paused?: boolean;
  /** Reflects the real outcome of the last submitted vote, if any. */
  variant?: "normal" | "warning" | "success";
};

const RING_COLOR: Record<NonNullable<PublicLedgerPanelProps["variant"]>, string> = {
  normal: "#1baf7a",
  warning: "#e34948",
  success: "#1baf7a",
};

/**
 * A stack of translucent floating panels representing publicly disclosed
 * state (yes / no / total / nullifier count) — not a fake blockchain, just
 * a visual stand-in for "this is public." The real numbers are rendered as
 * accessible HTML elsewhere on the page.
 */
export function PublicLedgerPanel({ totalVotes, paused = false, variant = "normal" }: PublicLedgerPanelProps) {
  const groupRef = useRef<THREE.Group>(null);

  const panels = useMemo(
    () => [
      { y: 0.32, depth: 0, opacity: 0.5 },
      { y: 0.1, depth: -0.08, opacity: 0.65 },
      { y: -0.12, depth: -0.16, opacity: 0.85 },
    ],
    [],
  );

  const activity = Math.min(1, totalVotes / 10);

  useFrame((state) => {
    if (paused || !groupRef.current) return;
    groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.25) * 0.15;
    groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.04;
  });

  return (
    <group ref={groupRef}>
      {panels.map((p, i) => (
        <mesh key={i} position={[0, p.y, p.depth]}>
          <boxGeometry args={[0.9, 0.16, 0.02]} />
          <meshPhysicalMaterial
            color="#111114"
            transparent
            opacity={p.opacity}
            roughness={0.3}
            metalness={0.4}
            transmission={0.3}
            emissive="#3987e5"
            emissiveIntensity={0.15 + activity * 0.25}
          />
        </mesh>
      ))}
      {/* verification ring: green normally/on success, red on a real failure/already-voted result */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.12, -0.16]}>
        <torusGeometry args={[0.62, 0.008, 8, 64]} />
        <meshBasicMaterial
          color={RING_COLOR[variant]}
          transparent
          opacity={variant === "normal" ? 0.25 + activity * 0.35 : 0.7}
        />
      </mesh>
    </group>
  );
}
