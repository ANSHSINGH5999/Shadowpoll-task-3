"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const _dummy = new THREE.Object3D();

type OrbitParticlesProps = {
  count: number;
  radius: number;
  radiusJitter?: number;
  color: string;
  size?: number;
  speed?: number;
  paused?: boolean;
  opacity?: number;
};

/** A halo of particles drifting in loose orbits around the origin of the parent group. */
export function OrbitParticles({
  count,
  radius,
  radiusJitter = 0.4,
  color,
  size = 0.035,
  speed = 0.15,
  paused = false,
  opacity = 0.85,
}: OrbitParticlesProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  // One-time random seeds for this instance's lifetime — a lazy useState
  // initializer is the idiomatic, purity-rule-safe place for this (unlike
  // useMemo, which React expects to be a pure, re-computable derivation).
  const [seeds] = useState(() =>
    Array.from({ length: count }, () => ({
      theta: Math.random() * Math.PI * 2,
      phi: Math.acos(2 * Math.random() - 1),
      r: radius + (Math.random() - 0.5) * radiusJitter,
      speed: (0.5 + Math.random()) * speed,
      drift: Math.random() * Math.PI * 2,
    })),
  );

  useFrame((frameState) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = paused ? 0 : frameState.clock.elapsedTime;
    for (let i = 0; i < seeds.length; i++) {
      const s = seeds[i];
      const theta = s.theta + t * s.speed;
      const wobble = Math.sin(t * 0.4 + s.drift) * 0.15;
      const r = s.r + wobble;
      const x = r * Math.sin(s.phi) * Math.cos(theta);
      const y = r * Math.cos(s.phi) * 0.6;
      const z = r * Math.sin(s.phi) * Math.sin(theta);
      _dummy.position.set(x, y, z);
      _dummy.scale.setScalar(1);
      _dummy.updateMatrix();
      mesh.setMatrixAt(i, _dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
      <sphereGeometry args={[size, 6, 6]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} />
    </instancedMesh>
  );
}

type StreamParticlesProps = {
  count: number;
  from: THREE.Vector3Tuple;
  to: THREE.Vector3Tuple;
  color: string;
  size?: number;
  speed?: number;
  intensity?: number;
  paused?: boolean;
};

/**
 * Particles flowing along a fixed path (e.g. privacy core -> public ledger).
 * `intensity` in [0, 1] scales visible particle count and opacity — this is
 * how the real Yes/No vote share is reflected without faking new events.
 */
export function StreamParticles({
  count,
  from,
  to,
  color,
  size = 0.05,
  speed = 0.5,
  intensity = 1,
  paused = false,
}: StreamParticlesProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const [fromV] = useState(() => new THREE.Vector3(...from));
  const [toV] = useState(() => new THREE.Vector3(...to));

  const [seeds] = useState(() =>
    Array.from({ length: count }, () => ({
      offset: Math.random(),
      speed: (0.6 + Math.random() * 0.8) * speed,
      lateral: (Math.random() - 0.5) * 0.25,
    })),
  );

  const visibleCount = Math.max(0, Math.round(count * Math.min(1, Math.max(0, intensity))));

  useFrame((frameState) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = paused ? 0 : frameState.clock.elapsedTime;
    for (let i = 0; i < seeds.length; i++) {
      const s = seeds[i];
      if (i >= visibleCount) {
        _dummy.scale.setScalar(0);
        _dummy.updateMatrix();
        mesh.setMatrixAt(i, _dummy.matrix);
        continue;
      }
      const progress = paused ? s.offset : (s.offset + t * s.speed * 0.15) % 1;
      const pos = fromV.clone().lerp(toV, progress);
      pos.y += Math.sin(progress * Math.PI) * 0.3;
      pos.x += s.lateral;
      _dummy.position.copy(pos);
      const fade = Math.sin(progress * Math.PI);
      _dummy.scale.setScalar(0.6 + fade * 0.6);
      _dummy.updateMatrix();
      mesh.setMatrixAt(i, _dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
      <sphereGeometry args={[size, 6, 6]} />
      <meshBasicMaterial color={color} transparent opacity={0.9} />
    </instancedMesh>
  );
}
