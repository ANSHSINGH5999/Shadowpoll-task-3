"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

type VoterNodeProps = {
  paused?: boolean;
};

/**
 * An abstract, anonymous voter — a soft capsule silhouette with a small
 * sealed "private witness" capsule inside it. No identity, address, or key
 * is ever rendered; this is deliberately abstract.
 */
export function VoterNode({ paused = false }: VoterNodeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const lockRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (paused) return;
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.6) * 0.06;
    }
    if (lockRef.current) {
      const glow = 0.6 + Math.sin(state.clock.elapsedTime * 1.6) * 0.2;
      (lockRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = glow;
    }
  });

  return (
    <group ref={groupRef}>
      {/* silhouette */}
      <mesh position={[0, 0, 0]}>
        <capsuleGeometry args={[0.28, 0.55, 4, 12]} />
        <meshStandardMaterial color="#18171f" roughness={0.85} metalness={0.1} />
      </mesh>
      {/* sealed private-witness capsule */}
      <mesh ref={lockRef} position={[0, 0.05, 0.22]}>
        <octahedronGeometry args={[0.11, 0]} />
        <meshStandardMaterial
          color="#18171f"
          emissive="#3763c9"
          emissiveIntensity={0.6}
          roughness={0.3}
          metalness={0.5}
        />
      </mesh>
    </group>
  );
}
