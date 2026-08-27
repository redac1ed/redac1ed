import React, { Suspense, useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { OrbitControls, useGLTF, shaderMaterial } from '@react-three/drei';
import { oceanVertexShader, oceanFragmentShader, skyVertexShader, skyFragmentShader } from './shaders';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { MarchingCubes as MarchingCubesImpl } from 'three-stdlib';
import anime from 'animejs';
import ActivePanelOverlay from './panels';

const detectGPU = () => {
  if (typeof document === 'undefined') return { ok: true, software: false };
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return { ok: false, software: true };
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = (dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)) || '';
    const software = /swiftshader|software|llvmpipe|microsoft basic|angle \(google, vulkan/i.test(renderer)
      && !/angle \((nvidia|amd|intel|apple|radeon|geforce|qualcomm|adreno|mali)/i.test(renderer);
    return { ok: true, software, renderer };
  } catch {
    return { ok: true, software: false };
  }
};
const detectGPUTier = (renderer = '') => {
  if (/rtx|radeon rx|geforce (gtx 1[0-9]|16|20|30|40)|apple m[1-9]|arc a[0-9]/i.test(renderer)) return 'high';
  if (/geforce|radeon|nvidia|intel iris|intel arc|adreno (6|7)|apple gpu|mali-g7/i.test(renderer)) return 'mid';
  if (/intel.*(hd|uhd) graphics|adreno [1-5]|mali-[gt][1-6]/i.test(renderer)) return 'low';
  return '';
};
const OCEAN_Y = -6;
const GPU_INFO = detectGPU();
const PERF_TIER = (() => {
  if (typeof window === 'undefined') return 'high';
  if (!GPU_INFO.ok || GPU_INFO.software) return 'low';
  const ua = navigator.userAgent || '';
  const isMobile = /Android|iPhone|iPad|iPod|Mobile|Opera Mini|IEMobile/i.test(ua);
  if (isMobile) return 'low';
  const gpuTier = detectGPUTier(GPU_INFO.renderer);
  if (gpuTier) return gpuTier;
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 4;
  if (cores <= 4 || mem <= 3) return 'low';
  if (cores <= 6 || mem <= 6) return 'mid';
  return 'high';
})();
const IS_LOW = PERF_TIER === 'low';
const IS_MID = PERF_TIER === 'mid';
const FORCE_LITE = typeof window !== 'undefined' && /[?&](software|lite)\b/.test(window.location.search);
const SOFTWARE_RENDER = !GPU_INFO.ok || GPU_INFO.software || FORCE_LITE;
const OCEAN_SEGMENTS = IS_LOW ? 80 : IS_MID ? 160 : 256;
const OCEAN_SIZE = IS_LOW ? 1500 : IS_MID ? 2500 : 4000;
const DUST_COUNT = IS_LOW ? 800 : IS_MID ? 3000 : 7000;
const SPLASH_BODY_COUNT = IS_LOW ? 28 : IS_MID ? 48 : 72;
const SPLASH_RIPPLE_COUNT = IS_LOW ? 6 : 10;
const SPLASH_CROWN_SEGMENTS = IS_LOW ? 14 : IS_MID ? 18 : 22;
const SPLASH_FLUID_RATIO = 0.72;
const SPLASH_FIELD_RADIUS = 8;
const SPLASH_FIELD_HEIGHT = 6;
const SPLASH_FIELD_CENTER_Y = OCEAN_Y + 4;
const SKY_SEGMENTS = IS_LOW ? 24 : IS_MID ? 40 : 64;
const MAX_DPR = IS_LOW ? 1 : IS_MID ? 1.5 : 1.75;
const RIPPLE_SEGMENTS = IS_LOW ? 24 : 64;
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _spherical = new THREE.Spherical();
const DUST_VERTEX_SHADER = `
uniform float uTime;
attribute vec2 phase;
void main() {
  vec3 p = position;
  float life = mod(p.y + uTime * 8.0 + 40.0, 80.0) - 40.0;
  p.y = life;
  p.x += sin(uTime * 2.0) * 1.5 * phase.x;
  p.z += cos(uTime * 2.0) * 1.5 * phase.y;
  vec4 mvPos = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = 0.2 * (300.0 / -mvPos.z);
  gl_Position = projectionMatrix * mvPos;
}`;
const DUST_FRAGMENT_SHADER = `
void main() {
  float d = length(gl_PointCoord - vec2(0.5));
  if (d > 0.5) discard;
  float alpha = smoothstep(0.5, 0.15, d) * 0.6;
  gl_FragColor = vec4(1.0, 0.27, 0.13, alpha);
}`;
const CANVAS_GL = {
  antialias: !IS_LOW,
  powerPreference: 'high-performance',
  alpha: false,
  stencil: false,
  depth: true,
};
const CANVAS_PERFORMANCE = { min: 0.5 };
const CANVAS_INITIAL_DPR = Math.min(typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1, IS_LOW ? 1 : 1.25);
const CANVAS_DPR = CANVAS_INITIAL_DPR;
const CANVAS_CAMERA = { position: [0, 20, 90], fov: 10 };

function Shrine({ zoomed, onCrossWater, onShrineArrived }) {
  const { scene } = useGLTF('/bg-model/source/Malevolent_shrine_webp_draco.glb');
  const modelRef = useRef();
  const isRising = useRef(true);
  const scaleState = useRef({ value: 1 });
  const hasCrossed = useRef(false);
  const scaleAnimRef = useRef(null);
  const riseAnimRef = useRef(null);
  const offset = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const center = new THREE.Vector3();
    box.getCenter(center);
    return center.negate();
  }, [scene]);

  useMemo(() => {
    scene.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = false;
        obj.receiveShadow = false;
        obj.frustumCulled = true;
        const mat = obj.material;
        if (mat) {
          if ('flatShading' in mat) mat.flatShading = false;
          if (IS_LOW && mat.map) {
            mat.map.anisotropy = 1;
            mat.map.generateMipmaps = true;
            mat.map.minFilter = THREE.LinearMipmapNearestFilter;
          }
          mat.needsUpdate = true;
        }
      }
    });
  }, [scene]);

  useEffect(() => {
    if (!modelRef.current) return;
    modelRef.current.position.set(offset.x, offset.y - 60, offset.z);
    isRising.current = true;
    hasCrossed.current = false;
    const finalY = offset.y;
    let rumbleTick = 0;
    riseAnimRef.current = anime({
      targets: modelRef.current.position,
      y: finalY,
      duration: 5000,
      easing: 'easeOutCubic',
      update: () => {
        if (!modelRef.current || !isRising.current) return;
        rumbleTick = (rumbleTick + 1) % 3;
        if (rumbleTick === 0) {
          const rumble = 0.15;
          modelRef.current.position.x = offset.x + (Math.random() - 0.5) * rumble;
          modelRef.current.position.z = offset.z + (Math.random() - 0.5) * rumble;
        }
        if (!hasCrossed.current && modelRef.current.position.y >= OCEAN_Y) {
          hasCrossed.current = true;
          if (onCrossWater) onCrossWater();
        }
      },
      complete: () => {
        isRising.current = false;
        if (modelRef.current) modelRef.current.position.set(offset.x, finalY, offset.z);
        if (onShrineArrived) onShrineArrived();
      }
    });
    return () => {
      if (riseAnimRef.current) riseAnimRef.current.pause();
    };
  }, [offset, onCrossWater, onShrineArrived]);

  useEffect(() => {
    if (!modelRef.current) return;
    if (scaleAnimRef.current) scaleAnimRef.current.pause();
    scaleAnimRef.current = anime({
      targets: scaleState.current,
      value: zoomed ? 0 : 1,
      duration: 800,
      easing: 'easeOutCubic',
      update: () => {
        if (!modelRef.current) return;
        modelRef.current.scale.setScalar(scaleState.current.value);
        modelRef.current.visible = scaleState.current.value > 0.01;
      }
    });
  }, [zoomed]);

  return <primitive ref={modelRef} object={scene} />;
}

function SplashParticles({ splash }) {
  const count = SPLASH_BODY_COUNT;
  const meshRef = useRef();
  const worldRef = useRef(null);
  const dropletsRef = useRef([]);
  const activeRef = useRef(false);
  const splashApplied = useRef(0);
  const rippleRefs = useRef([]);
  const rippleStatesRef = useRef(Array.from({ length: SPLASH_RIPPLE_COUNT }, () => ({ active: false, age: 0, life: 0.75, strength: 1 })));
  const rippleCursorRef = useRef(0);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const velocity = useMemo(() => new THREE.Vector3(), []);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const fluidMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#72c9c4',
    transparent: true,
    opacity: 0.72,
    roughness: 0.04,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    ior: 1.333,
    thickness: 0.55,
    depthWrite: false,
    side: THREE.DoubleSide,
  }), []);
  const fluidSurface = useMemo(() => {
    const resolution = IS_LOW ? 24 : IS_MID ? 30 : 38;
    const surface = new MarchingCubesImpl(resolution, fluidMaterial, false, false, 24000);
    surface.isolation = 55;
    surface.frustumCulled = false;
    surface.renderOrder = 2;
    surface.visible = false;
    surface.scale.set(SPLASH_FIELD_RADIUS, SPLASH_FIELD_HEIGHT, SPLASH_FIELD_RADIUS);
    return surface;
  }, [fluidMaterial]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -28, 0) });
    world.allowSleep = true;
    world.solver.iterations = 8;
    world.solver.tolerance = 0.001;
    world.broadphase = new CANNON.SAPBroadphase(world);
    const waterMaterial = new CANNON.Material('water-surface');
    const dropletMaterial = new CANNON.Material('water-droplet');
    world.addContactMaterial(new CANNON.ContactMaterial(dropletMaterial, waterMaterial, {
      friction: 0.015,
      restitution: 0.08,
      contactEquationStiffness: 1e7,
      contactEquationRelaxation: 3,
    }));
    world.addContactMaterial(new CANNON.ContactMaterial(dropletMaterial, dropletMaterial, {
      friction: 0.01,
      restitution: 0.04,
      contactEquationStiffness: 5e6,
      contactEquationRelaxation: 4,
    }));
    const surface = new CANNON.Body({ mass: 0, material: waterMaterial });
    surface.addShape(new CANNON.Plane());
    surface.position.set(0, OCEAN_Y, 0);
    surface.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    surface.collisionFilterGroup = 1;
    surface.collisionFilterMask = 2;
    world.addBody(surface);
    const droplets = [];
    const fluidCount = Math.floor(count * SPLASH_FLUID_RATIO);
    for (let index = 0; index < count; index++) {
      const radius = index < fluidCount
        ? 0.07 + Math.random() * 0.09
        : 0.035 + Math.random() * 0.065;
      const body = new CANNON.Body({
        mass: 0.3 + radius * 3.5,
        material: dropletMaterial,
        shape: new CANNON.Sphere(radius),
        linearDamping: index < fluidCount ? 0.085 : 0.03,
        angularDamping: 0.12,
      });
      body.allowSleep = true;
      body.sleepSpeedLimit = 0.08;
      body.sleepTimeLimit = 0.25;
      body.collisionFilterGroup = 2;
      body.collisionFilterMask = 0;
      body.position.set(0, -100, 0);
      world.addBody(body);
      droplets.push({ body, radius, active: false, age: 0, absorbAge: 0, impacted: false });
      dummy.position.set(0, -100, 0);
      dummy.scale.setScalar(0);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    }
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.instanceMatrix.needsUpdate = true;
    dropletsRef.current = droplets;
    worldRef.current = world;
    return () => {
      worldRef.current = null;
      dropletsRef.current = [];
      fluidSurface.visible = false;
    };
  }, [count, dummy, fluidSurface]);

  const spawnRipple = useCallback((x, z, strength) => {
    const index = rippleCursorRef.current;
    rippleCursorRef.current = (index + 1) % SPLASH_RIPPLE_COUNT;
    const ripple = rippleRefs.current[index];
    const state = rippleStatesRef.current[index];
    if (!ripple || !state) return;
    state.active = true;
    state.age = 0;
    state.life = 0.55 + strength * 0.25;
    state.strength = strength;
    ripple.position.set(x, OCEAN_Y + 0.035, z);
    ripple.scale.setScalar(0.12);
    ripple.material.opacity = 0.34;
    ripple.visible = true;
  }, []);

  useEffect(() => {
    const world = worldRef.current;
    const droplets = dropletsRef.current;
    if (splash.id <= splashApplied.current || !world || droplets.length === 0) return;
    splashApplied.current = splash.id;
    fluidSurface.position.set(splash.x, SPLASH_FIELD_CENTER_Y, splash.z);
    for (let index = 0; index < droplets.length; index++) {
      const droplet = droplets[index];
      const angle = Math.random() * Math.PI * 2;
      const cosAngle = Math.cos(angle);
      const sinAngle = Math.sin(angle);
      const ratio = index / droplets.length;
      let radialSpeed;
      let verticalSpeed;
      let offset;
      if (ratio < 0.18) {
        radialSpeed = 0.3 + Math.random() * 0.9;
        verticalSpeed = 10 + Math.random() * 4;
        offset = 0.2 + Math.random() * 0.25;
      } else if (ratio < 0.72) {
        const corona = Math.random();
        radialSpeed = 2.5 + corona * 3.5;
        verticalSpeed = 8.5 - corona * 3 + Math.random() * 1.5;
        offset = 0.55 + Math.random() * 0.65;
      } else {
        radialSpeed = 7 + Math.random() * 5;
        verticalSpeed = 3 + Math.random() * 4;
        offset = 0.35 + Math.random() * 0.9;
      }
      const body = droplet.body;
      body.collisionFilterMask = 3;
      body.position.set(
        splash.x + cosAngle * offset,
        OCEAN_Y + droplet.radius + 0.12 + Math.random() * 0.12,
        splash.z + sinAngle * offset,
      );
      body.velocity.set(cosAngle * radialSpeed, verticalSpeed, sinAngle * radialSpeed);
      body.angularVelocity.set(
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
      );
      body.force.set(0, 0, 0);
      body.torque.set(0, 0, 0);
      body.quaternion.set(0, 0, 0, 1);
      body.wakeUp();
      droplet.active = true;
      droplet.age = 0;
      droplet.absorbAge = 0;
      droplet.impacted = false;
    }
    activeRef.current = true;
  }, [splash.id, splash.x, splash.z, fluidSurface]);

  useFrame((_, delta) => {
    const world = worldRef.current;
    const mesh = meshRef.current;
    if (!activeRef.current || !world || !mesh) return;
    const dt = Math.min(delta, 0.05);
    const droplets = dropletsRef.current;
    const fluidCount = Math.floor(droplets.length * SPLASH_FLUID_RATIO);
    const interactionRadius = 0.95;
    const interactionRadiusSq = interactionRadius * interactionRadius;
    for (let firstIndex = 0; firstIndex < fluidCount; firstIndex++) {
      const first = droplets[firstIndex];
      if (!first.active || first.impacted) continue;
      for (let secondIndex = firstIndex + 1; secondIndex < fluidCount; secondIndex++) {
        const second = droplets[secondIndex];
        if (!second.active || second.impacted) continue;
        const deltaX = second.body.position.x - first.body.position.x;
        const deltaY = second.body.position.y - first.body.position.y;
        const deltaZ = second.body.position.z - first.body.position.z;
        const distanceSq = deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ;
        if (distanceSq <= 0.0001 || distanceSq >= interactionRadiusSq) continue;
        const distance = Math.sqrt(distanceSq);
        const inverseDistance = 1 / distance;
        const minimumDistance = (first.radius + second.radius) * 1.25;
        const cohesion = Math.max(0, distance - minimumDistance) * 5.5;
        const influence = 1 - distance / interactionRadius;
        const forceX = deltaX * inverseDistance * cohesion;
        const forceY = deltaY * inverseDistance * cohesion;
        const forceZ = deltaZ * inverseDistance * cohesion;
        first.body.force.x += forceX + (second.body.velocity.x - first.body.velocity.x) * influence * 0.18;
        first.body.force.y += forceY + (second.body.velocity.y - first.body.velocity.y) * influence * 0.18;
        first.body.force.z += forceZ + (second.body.velocity.z - first.body.velocity.z) * influence * 0.18;
        second.body.force.x -= forceX + (second.body.velocity.x - first.body.velocity.x) * influence * 0.18;
        second.body.force.y -= forceY + (second.body.velocity.y - first.body.velocity.y) * influence * 0.18;
        second.body.force.z -= forceZ + (second.body.velocity.z - first.body.velocity.z) * influence * 0.18;
      }
    }
    world.step(1 / 120, dt, 4);
    let activeCount = 0;
    let fluidBallCount = 0;
    fluidSurface.reset();
    for (let index = 0; index < droplets.length; index++) {
      const droplet = droplets[index];
      if (!droplet.active) continue;
      activeCount++;
      droplet.age += dt;
      const body = droplet.body;
      const atSurface = body.position.y <= OCEAN_Y + droplet.radius * 1.12 && body.velocity.y <= 0.8;
      if (atSurface && !droplet.impacted) {
        droplet.impacted = true;
        const impactSpeed = Math.min(1, Math.abs(body.velocity.y) / 12);
        if (impactSpeed > 0.18 && index % 3 === 0) spawnRipple(body.position.x, body.position.z, impactSpeed);
      }
      if (droplet.impacted) {
        droplet.absorbAge += dt;
        body.velocity.x *= 0.91;
        body.velocity.z *= 0.91;
        body.velocity.y *= 0.45;
      }
      const absorb = droplet.impacted ? Math.min(1, droplet.absorbAge / (0.38 + droplet.radius)) : 0;
      if (absorb >= 1 || droplet.age > 2.8 || body.position.y < OCEAN_Y - 1) {
        droplet.active = false;
        body.collisionFilterMask = 0;
        body.position.set(0, -100, 0);
        body.velocity.set(0, 0, 0);
        body.sleep();
        dummy.position.set(0, -100, 0);
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
        activeCount--;
        continue;
      }
      dummy.position.set(body.position.x, body.position.y, body.position.z);
      if (index < fluidCount) {
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
        const normalizedX = 0.5 + (body.position.x - fluidSurface.position.x) / (SPLASH_FIELD_RADIUS * 2);
        const normalizedY = 0.5 + (body.position.y - SPLASH_FIELD_CENTER_Y) / (SPLASH_FIELD_HEIGHT * 2);
        const normalizedZ = 0.5 + (body.position.z - fluidSurface.position.z) / (SPLASH_FIELD_RADIUS * 2);
        const inside = normalizedX > 0.03 && normalizedX < 0.97
          && normalizedY > 0.03 && normalizedY < 0.97
          && normalizedZ > 0.03 && normalizedZ < 0.97;
        if (inside) {
          const remaining = 1 - absorb;
          const strength = (0.038 + droplet.radius * 0.09) * remaining;
          fluidSurface.addBall(normalizedX, normalizedY, normalizedZ, strength, 12);
          fluidBallCount++;
        }
      } else if (droplet.impacted) {
        const spread = 1 + absorb * 2.4;
        dummy.quaternion.set(0, 0, 0, 1);
        dummy.scale.set(
          droplet.radius * spread,
          droplet.radius * Math.max(0.08, 1 - absorb),
          droplet.radius * spread,
        );
      } else {
        velocity.set(body.velocity.x, body.velocity.y, body.velocity.z);
        const speed = velocity.length();
        if (speed > 0.001) {
          velocity.normalize();
          dummy.quaternion.setFromUnitVectors(up, velocity);
        } else {
          dummy.quaternion.set(0, 0, 0, 1);
        }
        const stretch = Math.min(2.5, 1 + speed * 0.045);
        const width = droplet.radius / Math.sqrt(stretch);
        dummy.scale.set(width, droplet.radius * stretch, width);
      }
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    }
    fluidSurface.visible = fluidBallCount > 0;
    if (fluidBallCount > 0) fluidSurface.update();
    for (let index = 0; index < rippleStatesRef.current.length; index++) {
      const state = rippleStatesRef.current[index];
      const ripple = rippleRefs.current[index];
      if (!state.active || !ripple) continue;
      state.age += dt;
      const progress = state.age / state.life;
      if (progress >= 1) {
        state.active = false;
        ripple.visible = false;
        continue;
      }
      const scale = 0.12 + progress * (2.2 + state.strength * 1.8);
      ripple.scale.setScalar(scale);
      ripple.material.opacity = (1 - progress) * 0.34;
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (activeCount === 0) {
      activeRef.current = false;
      fluidSurface.visible = false;
    }
  });

  return (
    <>
      <primitive object={fluidSurface} />
      <instancedMesh ref={meshRef} args={[null, null, count]} frustumCulled={false} renderOrder={2}>
        <sphereGeometry args={[1, IS_LOW ? 8 : 12, IS_LOW ? 6 : 9]} />
        <meshPhysicalMaterial
          color="#9adbd7"
          transparent
          opacity={0.48}
          roughness={0.08}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.08}
          ior={1.333}
          thickness={0.35}
          depthWrite={false}
        />
      </instancedMesh>
      {Array.from({ length: SPLASH_RIPPLE_COUNT }, (_, index) => (
        <mesh
          key={index}
          ref={(element) => { rippleRefs.current[index] = element; }}
          rotation={[-Math.PI / 2, 0, 0]}
          visible={false}
          frustumCulled={false}
          renderOrder={3}
        >
          <ringGeometry args={[0.42, 0.58, RIPPLE_SEGMENTS]} />
          <meshBasicMaterial color="#d9f6ef" transparent opacity={0} depthWrite={false} depthTest={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </>
  );
}

function PhysicsWaterCrown({ splash }) {
  const count = SPLASH_BODY_COUNT;
  const crownCount = Math.min(SPLASH_CROWN_SEGMENTS, count);
  const meshRef = useRef();
  const sheetRef = useRef();
  const worldRef = useRef(null);
  const dropletsRef = useRef([]);
  const constraintsRef = useRef([]);
  const activeRef = useRef(false);
  const splashApplied = useRef(0);
  const crownAgeRef = useRef(0);
  const centerRef = useRef({ x: 0, z: 0 });
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const velocity = useMemo(() => new THREE.Vector3(), []);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const sheetGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(crownCount * 9), 3));
    const indices = [];
    for (let index = 0; index < crownCount; index++) {
      const next = (index + 1) % crownCount;
      const lower = index * 3;
      const middle = lower + 1;
      const upper = lower + 2;
      const nextLower = next * 3;
      const nextMiddle = nextLower + 1;
      const nextUpper = nextLower + 2;
      indices.push(
        lower, nextLower, middle,
        nextLower, nextMiddle, middle,
        middle, nextMiddle, upper,
        nextMiddle, nextUpper, upper,
      );
    }
    geometry.setIndex(indices);
    return geometry;
  }, [crownCount]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -26, 0) });
    world.allowSleep = true;
    world.solver.iterations = 12;
    world.solver.tolerance = 0.001;
    world.broadphase = new CANNON.SAPBroadphase(world);
    const waterMaterial = new CANNON.Material('crown-water-surface');
    const dropletMaterial = new CANNON.Material('crown-water-droplet');
    world.addContactMaterial(new CANNON.ContactMaterial(dropletMaterial, waterMaterial, {
      friction: 0.01,
      restitution: 0.06,
      contactEquationStiffness: 1e7,
      contactEquationRelaxation: 3,
    }));
    world.addContactMaterial(new CANNON.ContactMaterial(dropletMaterial, dropletMaterial, {
      friction: 0.008,
      restitution: 0.025,
      contactEquationStiffness: 8e6,
      contactEquationRelaxation: 4,
    }));
    const surface = new CANNON.Body({ mass: 0, material: waterMaterial });
    surface.addShape(new CANNON.Plane());
    surface.position.set(0, OCEAN_Y, 0);
    surface.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    surface.collisionFilterGroup = 1;
    surface.collisionFilterMask = 2;
    world.addBody(surface);
    const droplets = [];
    for (let index = 0; index < count; index++) {
      const crown = index < crownCount;
      const radius = crown ? 0.075 + Math.random() * 0.045 : 0.035 + Math.random() * 0.065;
      const body = new CANNON.Body({
        mass: crown ? 0.5 : 0.24,
        material: dropletMaterial,
        shape: new CANNON.Sphere(radius),
        linearDamping: crown ? 0.06 : 0.025,
        angularDamping: 0.12,
      });
      body.collisionFilterGroup = 2;
      body.collisionFilterMask = 0;
      body.position.set(0, -100, 0);
      body.allowSleep = true;
      body.sleepSpeedLimit = 0.08;
      body.sleepTimeLimit = 0.25;
      world.addBody(body);
      droplets.push({ body, radius, active: false, impacted: false, absorbAge: 0, age: 0 });
      dummy.position.set(0, -100, 0);
      dummy.scale.setScalar(0);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    }
    const constraints = [];
    for (let index = 0; index < crownCount; index++) {
      const constraint = new CANNON.DistanceConstraint(
        droplets[index].body,
        droplets[(index + 1) % crownCount].body,
        0.22,
        28,
      );
      constraint.collideConnected = false;
      constraint.disable();
      world.addConstraint(constraint);
      constraints.push(constraint);
    }
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.instanceMatrix.needsUpdate = true;
    dropletsRef.current = droplets;
    constraintsRef.current = constraints;
    worldRef.current = world;
    return () => {
      constraints.forEach((constraint) => world.removeConstraint(constraint));
      worldRef.current = null;
      dropletsRef.current = [];
      constraintsRef.current = [];
      sheetGeometry.dispose();
    };
  }, [count, crownCount, dummy, sheetGeometry]);

  useEffect(() => {
    const world = worldRef.current;
    const droplets = dropletsRef.current;
    if (splash.id <= splashApplied.current || !world || droplets.length === 0) return;
    splashApplied.current = splash.id;
    centerRef.current.x = splash.x;
    centerRef.current.z = splash.z;
    crownAgeRef.current = 0;
    constraintsRef.current.forEach((constraint) => {
      constraint.distance = 0.22;
      constraint.enable();
    });
    for (let index = 0; index < droplets.length; index++) {
      const droplet = droplets[index];
      const crown = index < crownCount;
      const angle = crown
        ? (index / crownCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.08
        : Math.random() * Math.PI * 2;
      const cosAngle = Math.cos(angle);
      const sinAngle = Math.sin(angle);
      const offset = crown ? 0.42 + Math.random() * 0.12 : 0.3 + Math.random() * 0.9;
      const radialSpeed = crown ? 3 + Math.random() * 2.2 : 6 + Math.random() * 7;
      const verticalSpeed = crown ? 11 + Math.random() * 4 : 3 + Math.random() * 6;
      const body = droplet.body;
      body.collisionFilterMask = 3;
      body.position.set(
        splash.x + cosAngle * offset,
        OCEAN_Y + droplet.radius + 0.08,
        splash.z + sinAngle * offset,
      );
      body.velocity.set(cosAngle * radialSpeed, verticalSpeed, sinAngle * radialSpeed);
      body.angularVelocity.set(
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6,
      );
      body.force.set(0, 0, 0);
      body.torque.set(0, 0, 0);
      body.quaternion.set(0, 0, 0, 1);
      body.wakeUp();
      droplet.active = true;
      droplet.impacted = false;
      droplet.absorbAge = 0;
      droplet.age = 0;
    }
    if (sheetRef.current) {
      sheetRef.current.visible = true;
      sheetRef.current.material.opacity = 0.56;
    }
    activeRef.current = true;
  }, [splash.id, splash.x, splash.z, crownCount]);

  useFrame((_, delta) => {
    const world = worldRef.current;
    const mesh = meshRef.current;
    const sheet = sheetRef.current;
    if (!activeRef.current || !world || !mesh || !sheet) return;
    const dt = Math.min(delta, 0.05);
    crownAgeRef.current += dt;
    const crownAge = crownAgeRef.current;
    if (crownAge < 0.68) {
      const distance = 0.22 + crownAge * 1.5;
      constraintsRef.current.forEach((constraint) => {
        constraint.distance = distance;
      });
    } else {
      constraintsRef.current.forEach((constraint) => constraint.disable());
    }
    world.step(1 / 120, dt, 5);
    let activeCount = 0;
    const droplets = dropletsRef.current;
    for (let index = 0; index < droplets.length; index++) {
      const droplet = droplets[index];
      if (!droplet.active) continue;
      activeCount++;
      droplet.age += dt;
      const body = droplet.body;
      const atSurface = body.position.y <= OCEAN_Y + droplet.radius * 1.15 && body.velocity.y <= 0.6;
      if (atSurface && !droplet.impacted) droplet.impacted = true;
      if (droplet.impacted) {
        droplet.absorbAge += dt;
        body.velocity.x *= 0.9;
        body.velocity.z *= 0.9;
        body.velocity.y *= 0.38;
      }
      const absorb = droplet.impacted ? Math.min(1, droplet.absorbAge / 0.52) : 0;
      if (absorb >= 1 || droplet.age > 2.6 || body.position.y < OCEAN_Y - 1) {
        droplet.active = false;
        body.collisionFilterMask = 0;
        body.position.set(0, -100, 0);
        body.velocity.set(0, 0, 0);
        body.sleep();
        dummy.position.set(0, -100, 0);
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
        activeCount--;
        continue;
      }
      if (index < crownCount && crownAge < 0.96) {
        dummy.position.set(0, -100, 0);
        dummy.scale.setScalar(0);
      } else {
        dummy.position.set(body.position.x, body.position.y, body.position.z);
        if (droplet.impacted) {
          const spread = 1 + absorb * 2.8;
          dummy.quaternion.set(0, 0, 0, 1);
          dummy.scale.set(
            droplet.radius * spread,
            droplet.radius * Math.max(0.06, 1 - absorb),
            droplet.radius * spread,
          );
        } else {
          velocity.set(body.velocity.x, body.velocity.y, body.velocity.z);
          const speed = velocity.length();
          if (speed > 0.001) {
            velocity.normalize();
            dummy.quaternion.setFromUnitVectors(up, velocity);
          } else {
            dummy.quaternion.set(0, 0, 0, 1);
          }
          const stretch = Math.min(2.1, 1 + speed * 0.038);
          const width = droplet.radius / Math.sqrt(stretch);
          dummy.scale.set(width, droplet.radius * stretch, width);
        }
      }
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    }
    const positions = sheetGeometry.attributes.position.array;
    const baseRadius = 0.34 + Math.min(crownAge, 0.72) * 4.1;
    for (let index = 0; index < crownCount; index++) {
      const angle = (index / crownCount) * Math.PI * 2;
      const lowerOffset = index * 9;
      const middleOffset = lowerOffset + 3;
      const upperOffset = lowerOffset + 6;
      const body = droplets[index].body;
      const cosAngle = Math.cos(angle);
      const sinAngle = Math.sin(angle);
      const lowerX = centerRef.current.x + cosAngle * baseRadius;
      const lowerZ = centerRef.current.z + sinAngle * baseRadius;
      positions[lowerOffset] = lowerX;
      positions[lowerOffset + 1] = OCEAN_Y + 0.035;
      positions[lowerOffset + 2] = lowerZ;
      const bulge = Math.max(0, 0.42 - crownAge * 0.25);
      positions[middleOffset] = (lowerX + body.position.x) * 0.5 + cosAngle * bulge;
      positions[middleOffset + 1] = OCEAN_Y + Math.max(0.05, (body.position.y - OCEAN_Y) * 0.5);
      positions[middleOffset + 2] = (lowerZ + body.position.z) * 0.5 + sinAngle * bulge;
      positions[upperOffset] = body.position.x;
      positions[upperOffset + 1] = Math.max(OCEAN_Y + 0.04, body.position.y);
      positions[upperOffset + 2] = body.position.z;
    }
    sheetGeometry.attributes.position.needsUpdate = true;
    sheetGeometry.computeVertexNormals();
    if (crownAge < 1.02) {
      sheet.visible = true;
      sheet.material.opacity = crownAge < 0.58
        ? 0.42
        : Math.max(0, 0.42 * (1 - (crownAge - 0.58) / 0.44));
    } else {
      sheet.visible = false;
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (activeCount === 0) {
      activeRef.current = false;
      sheet.visible = false;
    }
  });

  return (
    <>
      <mesh ref={sheetRef} geometry={sheetGeometry} frustumCulled={false} renderOrder={2} visible={false}>
        <meshPhysicalMaterial
          color="#4dbab4"
          transparent
          opacity={0.42}
          roughness={0.06}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.06}
          ior={1.333}
          thickness={0.45}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <instancedMesh ref={meshRef} args={[null, null, count]} frustumCulled={false} renderOrder={2}>
        <sphereGeometry args={[1, IS_LOW ? 8 : 12, IS_LOW ? 6 : 9]} />
        <meshPhysicalMaterial
          color="#82d2cd"
          transparent
          opacity={0.5}
          roughness={0.07}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.08}
          ior={1.333}
          thickness={0.28}
          depthWrite={false}
        />
      </instancedMesh>
    </>
  );
}

function WaterRipple({ splash }) {
  const groupRef = useRef();
  const ringARef = useRef();
  const ringBRef = useRef();
  const flashRef = useRef();
  const animsRef = useRef([]);
  const splashApplied = useRef(0);

  useEffect(() => {
    const group = groupRef.current;
    const ringA = ringARef.current;
    const ringB = ringBRef.current;
    const flash = flashRef.current;
    if (splash.id <= splashApplied.current || !group || !ringA || !ringB || !flash) return;
    splashApplied.current = splash.id;
    animsRef.current.forEach((a) => a && a.pause());
    group.position.set(splash.x, OCEAN_Y + 0.05, splash.z);

    const primary = { scale: 0.25, opacity: 0.38 };
    ringA.scale.setScalar(0.25);
    ringA.material.opacity = 0.38;
    ringA.visible = true;
    const animA = anime({
      targets: primary,
      scale: 10,
      opacity: 0,
      duration: 1900,
      easing: 'easeOutQuad',
      update: () => {
        ringA.scale.setScalar(primary.scale);
        ringA.material.opacity = primary.opacity;
      },
      complete: () => { ringA.visible = false; },
    });

    const secondary = { scale: 0.2, opacity: 0.24 };
    ringB.scale.setScalar(0.2);
    ringB.material.opacity = 0.24;
    ringB.visible = true;
    const animB = anime({
      targets: secondary,
      scale: 6,
      opacity: 0,
      duration: 1700,
      delay: 140,
      easing: 'easeOutQuad',
      update: () => {
        ringB.scale.setScalar(secondary.scale);
        ringB.material.opacity = secondary.opacity;
      },
      complete: () => { ringB.visible = false; },
    });

    const contact = { scale: 0.6, opacity: 0.42 };
    flash.scale.setScalar(0.6);
    flash.material.opacity = 0.42;
    flash.visible = true;
    const animFlash = anime({
      targets: contact,
      scale: 1.8,
      opacity: 0,
      duration: 420,
      easing: 'easeOutCubic',
      update: () => {
        flash.scale.setScalar(contact.scale);
        flash.material.opacity = contact.opacity;
      },
      complete: () => { flash.visible = false; },
    });

    animsRef.current = [animA, animB, animFlash];
    return () => { animsRef.current.forEach((a) => a && a.pause()); };
  }, [splash.id, splash.x, splash.z]);

  return (
    <group ref={groupRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, OCEAN_Y + 0.05, 0]} frustumCulled={false} renderOrder={3}>
      <mesh ref={ringARef} visible={false}>
        <ringGeometry args={[0.42, 0.6, RIPPLE_SEGMENTS]} />
        <meshBasicMaterial color="#dff9f2" transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} depthTest={false} />
      </mesh>
      <mesh ref={ringBRef} visible={false}>
        <ringGeometry args={[0.5, 0.62, RIPPLE_SEGMENTS]} />
        <meshBasicMaterial color="#bfeee3" transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} depthTest={false} />
      </mesh>
      <mesh ref={flashRef} visible={false}>
        <circleGeometry args={[0.6, RIPPLE_SEGMENTS]} />
        <meshBasicMaterial color="#f2fffb" transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} depthTest={false} />
      </mesh>
    </group>
  );
}

function DustParticles() {
  const count = DUST_COUNT;
  const materialRef = useRef();
  const { positions, phases } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const ph = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 80;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 80 - 40;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 80;
      const a = Math.random() * Math.PI * 2;
      ph[i * 2] = Math.cos(a);
      ph[i * 2 + 1] = Math.sin(a);
    }
    return { positions: pos, phases: ph };
  }, [count]);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-phase" count={count} array={phases} itemSize={2} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexShader={DUST_VERTEX_SHADER}
        fragmentShader={DUST_FRAGMENT_SHADER}
        uniforms={{ uTime: { value: 0 } }}
      />
    </points>
  );
}

const SkyMaterial = shaderMaterial(
  {
    uTime: 0,
    uOpacity: 0,
    uPulse: 0.5,
    uFlicker: 0.0,
    uFlickerPos: 0.5,
    uTopColor: new THREE.Color('#1a0205'),
    uHorizonColor: new THREE.Color('#a01818'),
    uBottomColor: new THREE.Color('#2a0508'),
    uCloudColor: new THREE.Color('#0a0002'),
  },
  skyVertexShader,
  skyFragmentShader
);
extend({ SkyMaterial });

function BackgroundSphere() {
  const materialRef = useRef();
  const animRefs = useRef([]);
  const flickerTimeoutRef = useRef(null);

  useEffect(() => {
    if (!materialRef.current) return;
    const mat = materialRef.current;
    mat.uOpacity = 0;
    mat.uTime = 0;
    mat.uPulse = 0.5;
    mat.uFlicker = 0;
    mat.uFlickerPos = 0.5;
    const fadeAnim = anime({
      targets: mat,
      uOpacity: 1.0,
      duration: 4000,
      easing: 'easeInOutQuad',
      delay: 1000,
    });
    const timeState = { value: 0 };
    const timeAnim = anime({
      targets: timeState,
      value: 100000,
      duration: 100000 * 1000,
      easing: 'linear',
      update: () => { mat.uTime = timeState.value; },
    });
    const pulseState = { value: 0 };
    const pulseAnim = anime({
      targets: pulseState,
      value: 1,
      duration: 12500,
      direction: 'alternate',
      loop: true,
      easing: 'easeInOutSine',
      update: () => { mat.uPulse = pulseState.value; },
    });
    let cancelled = false;
    const flickerState = { value: 0 };
    const scheduleFlicker = () => {
      if (cancelled) return;
      const delay = 1500 + Math.random() * 4000;
      flickerTimeoutRef.current = setTimeout(() => {
        if (cancelled || !materialRef.current) return;
        materialRef.current.uFlickerPos = Math.random();
        flickerState.value = 1;
        anime({
          targets: flickerState,
          value: 0,
          duration: 350,
          easing: 'easeOutExpo',
          update: () => {
            if (materialRef.current) materialRef.current.uFlicker = flickerState.value;
          },
          complete: () => {
            if (materialRef.current) materialRef.current.uFlicker = 0;
            scheduleFlicker();
          },
        });
      }, delay);
    };
    scheduleFlicker();
    animRefs.current = [fadeAnim, timeAnim, pulseAnim];
    return () => {
      cancelled = true;
      if (flickerTimeoutRef.current) clearTimeout(flickerTimeoutRef.current);
      animRefs.current.forEach(a => a && a.pause());
    };
  }, []);

  return (
    <mesh position={[0, 0, 0]} frustumCulled={false}>
      <sphereGeometry args={[200, SKY_SEGMENTS, SKY_SEGMENTS]} />
      <skyMaterial
        ref={materialRef}
        side={THREE.BackSide}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

const OceanMaterial = shaderMaterial(
  {
    uTime: 0,
    uColor: new THREE.Color('#0a3a3f'),
    uDeepColor: new THREE.Color('#021014'),
    uSurfaceColor: new THREE.Color('#0fb5a8'),
    uFoamColor: new THREE.Color('#9affe8'),
    uOpacity: 1.0,
    uFogColor: new THREE.Color('#1a0408'),
    uFogNear: 40,
    uFogFar: 120,
    uSplashCenter: new THREE.Vector2(0, 0),
    uSplashTime: -10.0,
    uSplashRadius: 0.0,
    uSkyTint: new THREE.Color('#8a1a18'),
  },
  oceanVertexShader,
  oceanFragmentShader
);

extend({ OceanMaterial });

function Ocean({ splash, onTap }) {
  const meshRef = useRef();
  const materialRef = useRef();
  const splashApplied = useRef(0);
  const timeStateRef = useRef({ value: 0 });
  const timeAnimRef = useRef(null);
  const lastCamX = useRef(0);
  const lastCamZ = useRef(0);
  const { camera } = useThree();

  useEffect(() => {
    if (!materialRef.current) return;
    timeStateRef.current.value = 0;
    timeAnimRef.current = anime({
      targets: timeStateRef.current,
      value: 100000,
      duration: 100000 * 2500,
      easing: 'linear',
      update: () => {
        if (materialRef.current) materialRef.current.uTime = timeStateRef.current.value;
      },
    });
    return () => { if (timeAnimRef.current) timeAnimRef.current.pause(); };
  }, []);

  useEffect(() => {
    if (splash.id <= splashApplied.current || !materialRef.current) return;
    splashApplied.current = splash.id;
    materialRef.current.uSplashTime = timeStateRef.current.value;
    materialRef.current.uSplashCenter.set(splash.x, splash.z);
  }, [splash.id, splash.x, splash.z]);

  useFrame(() => {
    if (!meshRef.current) return;
    const cx = camera.position.x;
    const cz = camera.position.z;
    if (cx !== lastCamX.current || cz !== lastCamZ.current) {
      meshRef.current.position.x = cx;
      meshRef.current.position.z = cz;
      lastCamX.current = cx;
      lastCamZ.current = cz;
    }
  });

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, OCEAN_Y, 0]}
      frustumCulled={false}
      onClick={(event) => {
        event.stopPropagation();
        onTap(event.point.x, event.point.z);
      }}
    >
      <planeGeometry args={[OCEAN_SIZE, OCEAN_SIZE, OCEAN_SEGMENTS, OCEAN_SEGMENTS]} />
      <oceanMaterial
        ref={materialRef}
        transparent
        side={THREE.FrontSide}
        depthWrite={true}
        uFogNear={60}
        uFogFar={260}
      />
    </mesh>
  );
}

function Controls({ zoomed, rotationTarget, onRotationComplete, rushTarget, onRushComplete }) {
  const { camera, gl } = useThree();
  const controlsRef = useRef();
  const tweenStateRef = useRef({ targetY: 0, distance: 90 });
  const animRef = useRef(null);
  const rotationAnimRef = useRef(null);
  const rushAnimRef = useRef(null);

  useEffect(() => {
    if (!controlsRef.current) return;
    if (animRef.current) animRef.current.pause();
    animRef.current = anime({
      targets: tweenStateRef.current,
      targetY: zoomed ? 5 : 0,
      distance: zoomed ? 0.1 : 90,
      duration: 1200,
      easing: 'easeInOutCubic',
      update: () => {
        const ctrl = controlsRef.current;
        if (!ctrl) return;
        ctrl.target.y = tweenStateRef.current.targetY;
        _vec3A.copy(camera.position).sub(ctrl.target).normalize();
        camera.position.copy(ctrl.target).addScaledVector(_vec3A, tweenStateRef.current.distance);
        ctrl.minDistance = tweenStateRef.current.distance;
        ctrl.maxDistance = tweenStateRef.current.distance;
        ctrl.update();
      },
    });
    return () => { if (animRef.current) animRef.current.pause(); };
  }, [zoomed, camera]);

  useEffect(() => {
    if (rotationTarget === null || !controlsRef.current) return;
    if (rotationAnimRef.current) rotationAnimRef.current.pause();
    const startAngle = controlsRef.current.getAzimuthalAngle();
    const delta = rotationTarget * (Math.PI / 2);
    const endAngle = startAngle + delta;
    const rotationState = { value: startAngle };
    rotationAnimRef.current = anime({
      targets: rotationState,
      value: endAngle,
      duration: 800,
      easing: 'easeInOutCubic',
      update: () => {
        const ctrl = controlsRef.current;
        if (!ctrl) return;
        _vec3A.copy(camera.position).sub(ctrl.target);
        _spherical.setFromVector3(_vec3A);
        _spherical.theta = rotationState.value;
        _vec3B.setFromSpherical(_spherical);
        camera.position.copy(ctrl.target).add(_vec3B);
        ctrl.update();
      },
      complete: () => {
        if (onRotationComplete) onRotationComplete();
      }
    });
    return () => { if (rotationAnimRef.current) rotationAnimRef.current.pause(); };
  }, [rotationTarget, camera, onRotationComplete]);

  useEffect(() => {
    if (!rushTarget || !controlsRef.current) return;
    if (rushAnimRef.current) rushAnimRef.current.pause();
    const isEntering = rushTarget.type === 'in';
    const startDistance = isEntering ? 90 : 15;
    const endDistance = isEntering ? 15 : 90;
    const rushState = { distance: startDistance };
    rushAnimRef.current = anime({
      targets: rushState,
      distance: endDistance,
      duration: 400,
      easing: 'easeInOutCubic',
      update: () => {
        const ctrl = controlsRef.current;
        if (!ctrl || !camera) return;
        ctrl.target.y = 0;
        _vec3A.copy(camera.position).sub(ctrl.target).normalize();
        camera.position.copy(ctrl.target).addScaledVector(_vec3A, rushState.distance);
        ctrl.minDistance = rushState.distance;
        ctrl.maxDistance = rushState.distance;
        ctrl.update();
      },
      complete: () => {
        if (isEntering && onRushComplete) onRushComplete();
      },
    });
    return () => { if (rushAnimRef.current) rushAnimRef.current.pause(); };
  }, [rushTarget, camera, onRushComplete]);

  return (
    <OrbitControls
      ref={controlsRef}
      args={[camera, gl.domElement]}
      enablePan={false}
      enableZoom={false}
      enableRotate={false}
      minPolarAngle={Math.PI / 2.2}
      maxPolarAngle={Math.PI / 2.2}
    />
  );
}

function AdaptiveQuality() {
  const { gl } = useThree();
  const accum = useRef(0);
  const frames = useRef(0);
  const currentDpr = useRef(Math.min(window.devicePixelRatio || 1, MAX_DPR));
  const minDpr = 0.6;
  const slowStreak = useRef(0);
  const fastStreak = useRef(0);
  const settled = useRef(false);

  useFrame((_, delta) => {
    accum.current += delta;
    frames.current += 1;
    if (accum.current < 0.5) return;
    const fps = frames.current / accum.current;
    accum.current = 0;
    frames.current = 0;
    if (fps < 45) {
      slowStreak.current += 1;
      fastStreak.current = 0;
    } else if (fps > 57) {
      fastStreak.current += 1;
      slowStreak.current = 0;
    } else {
      slowStreak.current = 0;
      fastStreak.current = 0;
    }
    if (slowStreak.current >= 2 && currentDpr.current > minDpr) {
      currentDpr.current = Math.max(minDpr, currentDpr.current - 0.25);
      gl.setPixelRatio(currentDpr.current);
      slowStreak.current = 0;
    } else if (!settled.current && fastStreak.current >= 4 && currentDpr.current < MAX_DPR) {
      currentDpr.current = Math.min(MAX_DPR, currentDpr.current + 0.15);
      gl.setPixelRatio(currentDpr.current);
      fastStreak.current = 0;
      if (currentDpr.current >= MAX_DPR) settled.current = true;
    }
  });
  return null;
}

function SceneContent({ zoomed, rotationTarget, onRotationComplete, rushTarget, onRushComplete }) {
  const [splash, setSplash] = useState({ id: 0, x: 0, z: 0 });
  const lastSplashAtRef = useRef(0);
  const triggerSplash = useCallback((x, z) => {
    const now = performance.now();
    if (now - lastSplashAtRef.current < 140) return;
    lastSplashAtRef.current = now;
    setSplash((previous) => ({ id: previous.id + 1, x, z }));
  }, []);
  const handleCrossWater = useCallback(() => triggerSplash(0, 0), [triggerSplash]);
  const handleShrineArrived = useCallback(() => {}, []);
  return (
    <>
      <fog attach="fog" args={['#1a0306', 80, 280]} />
      <ambientLight intensity={1.0} color="#ffffff" />
      <directionalLight position={[15, 15, 15]} intensity={3.5} color="#ffffff" />
      <directionalLight position={[-15, 10, -15]} intensity={1.5} color="#ffffff" />
      <pointLight position={[0, -4, 0]} intensity={2.5} color="#1affd0" distance={40} decay={2} />
      <Suspense fallback={null}>
        <BackgroundSphere />
        <Shrine zoomed={zoomed} onCrossWater={handleCrossWater} onShrineArrived={handleShrineArrived} />
        <Ocean splash={splash} onTap={triggerSplash} />
        <PhysicsWaterCrown splash={splash} />
        <WaterRipple splash={splash} />
        <DustParticles />
      </Suspense>
      <Controls zoomed={zoomed} rotationTarget={rotationTarget} onRotationComplete={onRotationComplete} rushTarget={rushTarget} onRushComplete={onRushComplete} />
      <AdaptiveQuality />
    </>
  );
}

function StaticFallbackBackground() {
  return (
    <div className="bg-fallback-root">
      <div className="bg-fallback-clouds" />
      <div className="bg-fallback-glow" />
      <div className="bg-fallback-horizon" />
    </div>
  );
}

export default function AnimeBackground({ zoomed, paused = false, rotationTarget, currentFace, onRotationComplete, onAboutOpen, onContactOpen, onProjectsOpen, rushTarget, onRushComplete }) {
  const bgRef = useRef();
  useEffect(() => {
    if (!bgRef.current) return;
    const a = anime({
      targets: bgRef.current,
      opacity: [0, 1],
      duration: 4000,
      easing: 'easeInOutQuad',
      delay: 1000,
    });
    return () => { if (a) a.pause(); };
  }, []);
  if (SOFTWARE_RENDER) {
    return (
      <div className="canvas-background">
        <StaticFallbackBackground />
        <ActivePanelOverlay
          currentFace={currentFace}
          visible={true}
          onAboutOpen={onAboutOpen}
          onContactOpen={onContactOpen}
          onProjectsOpen={onProjectsOpen}
        />
      </div>
    );
  }

  return (
    <div className="canvas-background">
      <div ref={bgRef} className="gradient-overlay" />
      <Canvas
        camera={CANVAS_CAMERA}
        className="bg-canvas"
        dpr={CANVAS_DPR}
        gl={CANVAS_GL}
        performance={CANVAS_PERFORMANCE}
        frameloop={paused ? 'never' : 'always'}
      >
        <SceneContent
          zoomed={zoomed}
          rotationTarget={rotationTarget}
          onRotationComplete={onRotationComplete}
          rushTarget={rushTarget}
          onRushComplete={onRushComplete}
        />
      </Canvas>
      <ActivePanelOverlay
        currentFace={currentFace}
        visible={true}
        onAboutOpen={onAboutOpen}
        onContactOpen={onContactOpen}
        onProjectsOpen={onProjectsOpen}
      />
    </div>
  );
}

if (!SOFTWARE_RENDER) {
  useGLTF.preload('/bg-model/source/Malevolent_shrine_webp_draco.glb');
}
