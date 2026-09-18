"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitParticles } from "./Particles";

type PrivacyCoreProps = {
  paused?: boolean;
  dim?: boolean;
  active?: boolean;
  particleCount: number;
};

/**
 * The central "privacy voting core" — a dark glass core inside a wireframe
 * shell, ringed by orbiting particles. Purely a visualization: the real
 * one-way transformation (secret key -> nullifier) happens in the deployed
 * Compact circuit, not here. `active` reflects a real in-flight vote
 * (wallet is proving/submitting), not a fake progress animation.
 */
export function PrivacyCore({ paused = false, dim = false, active = false, particleCount }: PrivacyCoreProps) {
  const shellRef = useRef<THREE.Mesh>(null);
  const ringGroupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);

  const speed = active ? 2.2 : 1;

  useFrame((state, delta) => {
    if (paused) return;
    if (shellRef.current) shellRef.current.rotation.y += delta * 0.12 * speed;
    if (shellRef.current) shellRef.current.rotation.x += delta * 0.03 * speed;
    if (ringGroupRef.current) ringGroupRef.current.rotation.z += delta * 0.08 * speed;
    if (coreRef.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * (active ? 3 : 1.2)) * (active ? 0.06 : 0.03);
      coreRef.current.scale.setScalar(pulse);
    }
  });

  const emissiveIntensity = dim ? 0.25 : active ? 1.4 : 0.9;

  return (
    <group>
      {/* inner glass core */}
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[0.55, 2]} />
        <meshPhysicalMaterial
          color="#18171f"
          emissive={dim ? "#3a3550" : "#5a4bd6"}
          emissiveIntensity={emissiveIntensity}
          roughness={0.2}
          metalness={0.6}
          transmission={0.4}
          thickness={0.6}
          clearcoat={1}
        />
      </mesh>

      {/* outer wireframe shell */}
      <mesh ref={shellRef}>
        <icosahedronGeometry args={[0.95, 1]} />
        <meshBasicMaterial color="#3763c9" wireframe transparent opacity={dim ? 0.18 : 0.45} />
      </mesh>

      {/* thin orbital rings */}
      <group ref={ringGroupRef}>
        <mesh rotation={[Math.PI / 2.2, 0, 0]}>
          <torusGeometry args={[1.35, 0.006, 8, 96]} />
          <meshBasicMaterial color="#5a4bd6" transparent opacity={dim ? 0.25 : 0.6} />
        </mesh>
        <mesh rotation={[Math.PI / 2.6, 0.6, 0]}>
          <torusGeometry args={[1.6, 0.005, 8, 96]} />
          <meshBasicMaterial color="#3763c9" transparent opacity={dim ? 0.16 : 0.4} />
        </mesh>
      </group>

      <OrbitParticles
        count={particleCount}
        radius={1.15}
        color={dim ? "#9a97a6" : "#5a4bd6"}
        paused={paused}
        opacity={dim ? 0.45 : 0.85}
      />
    </group>
  );
}
