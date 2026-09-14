"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const _dummy = new THREE.Object3D();
const MAX_VISIBLE = 64;

type NullifierFieldProps = {
  count: number;
  paused?: boolean;
};

/**
 * A small field of tetrahedra, one per spent nullifier (capped for
 * performance). Each is an abstract one-way hash — never a real value, and
 * never traceable back to a voter.
 */
export function NullifierField({ count, paused = false }: NullifierFieldProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const visible = Math.min(count, MAX_VISIBLE);

  const [seeds] = useState(() =>
    Array.from({ length: MAX_VISIBLE }, () => ({
      angle: Math.random() * Math.PI * 2,
      r: 0.15 + Math.random() * 0.3,
      y: (Math.random() - 0.5) * 0.3,
      spin: 0.3 + Math.random() * 0.6,
    })),
  );

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = paused ? 0 : state.clock.elapsedTime;
    for (let i = 0; i < seeds.length; i++) {
      if (i >= visible) {
        _dummy.scale.setScalar(0);
        _dummy.updateMatrix();
        mesh.setMatrixAt(i, _dummy.matrix);
        continue;
      }
      const s = seeds[i];
      const angle = s.angle + t * 0.1;
      _dummy.position.set(Math.cos(angle) * s.r, s.y, Math.sin(angle) * s.r);
      _dummy.rotation.set(t * s.spin, t * s.spin * 0.7, 0);
      _dummy.scale.setScalar(0.9);
      _dummy.updateMatrix();
      mesh.setMatrixAt(i, _dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_VISIBLE]} frustumCulled={false}>
      <tetrahedronGeometry args={[0.045]} />
      <meshStandardMaterial color="#12131a" emissive="#e34948" emissiveIntensity={0.35} roughness={0.4} />
    </instancedMesh>
  );
}
