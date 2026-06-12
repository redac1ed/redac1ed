import React, { Suspense, useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { OrbitControls, useGLTF, shaderMaterial } from '@react-three/drei';
import { oceanVertexShader, oceanFragmentShader, skyVertexShader, skyFragmentShader } from './shaders';
import * as THREE from 'three';
import anime from 'animejs';
import ActivePanelOverlay from './panels';

const OCEAN_Y = -6;

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

const GPU_INFO = detectGPU();

const detectGPUTier = (renderer = '') => {
  if (/rtx|radeon rx|geforce (gtx 1[0-9]|16|20|30|40)|apple m[1-9]|arc a[0-9]/i.test(renderer)) return 'high';
  if (/geforce|radeon|nvidia|intel iris|intel arc|adreno (6|7)|apple gpu|mali-g7/i.test(renderer)) return 'mid';
  if (/intel.*(hd|uhd) graphics|adreno [1-5]|mali-[gt][1-6]/i.test(renderer)) return 'low';
  return '';
};

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
const SPLASH_COUNT = IS_LOW ? 150 : IS_MID ? 350 : 600;
const SKY_SEGMENTS = IS_LOW ? 24 : IS_MID ? 40 : 64;
const MAX_DPR = IS_LOW ? 1 : IS_MID ? 1.5 : 1.75;
const RIPPLE_SEGMENTS = IS_LOW ? 24 : 64;

const SPLASH_VERTEX_SHADER = `
attribute float size;
attribute float opacity;
varying float vOpacity;
void main() {
  vOpacity = opacity;
  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = size * (200.0 / -mvPos.z);
  gl_Position = projectionMatrix * mvPos;
}`;

const SPLASH_FRAGMENT_SHADER = `
varying float vOpacity;
void main() {
  float d = length(gl_PointCoord - vec2(0.5));
  if (d > 0.5) discard;
  float alpha = smoothstep(0.5, 0.1, d) * vOpacity;
  gl_FragColor = vec4(0.6, 0.85, 1.0, alpha);
}`;

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

const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _spherical = new THREE.Spherical();
const _splashCenter = new THREE.Vector2(0, 0);

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

function SplashParticles({ active }) {
  const count = SPLASH_COUNT;
  const pointsRef = useRef();
  const velocities = useRef(null);
  const lifetimes = useRef(null);
  const startTime = useRef(0);
  const phase = useRef('idle');

  const { positions, sizes, opacities } = useMemo(() => ({
    positions: new Float32Array(count * 3),
    sizes: new Float32Array(count),
    opacities: new Float32Array(count),
  }), [count]);

  const baseSizes = useMemo(() => new Float32Array(count), [count]);

  const initParticles = useCallback(() => {
    if (!velocities.current) {
      velocities.current = new Float32Array(count * 3);
      lifetimes.current = new Float32Array(count);
    }
    const vel = velocities.current;
    const life = lifetimes.current;
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const angle = Math.random() * Math.PI * 2;
      const ca = Math.cos(angle);
      const sa = Math.sin(angle);
      const speed = 2 + Math.random() * 8;
      const upSpeed = 3 + Math.random() * 12;
      const radialOffset = Math.random() * 3;
      positions[i3] = ca * radialOffset;
      positions[i3 + 1] = OCEAN_Y;
      positions[i3 + 2] = sa * radialOffset;
      vel[i3] = ca * speed;
      vel[i3 + 1] = upSpeed;
      vel[i3 + 2] = sa * speed;
      life[i] = 0.8 + Math.random() * 1.5;
      const sz = 0.1 + Math.random() * 0.3;
      baseSizes[i] = sz;
      sizes[i] = sz;
      opacities[i] = 1.0;
    }
  }, [count, positions, sizes, opacities, baseSizes]);

  useEffect(() => {
    if (active) {
      initParticles();
      phase.current = 'burst';
      startTime.current = 0;
    }
  }, [active, initParticles]);

  useFrame((_, delta) => {
    if (phase.current === 'idle' || !pointsRef.current) return;
    startTime.current += delta;
    const elapsed = startTime.current;
    const vel = velocities.current;
    const life = lifetimes.current;
    let allDead = true;
    const posArr = pointsRef.current.geometry.attributes.position.array;
    const sizeArr = pointsRef.current.geometry.attributes.size.array;
    const opArr = pointsRef.current.geometry.attributes.opacity.array;
    const gravity = 15 * delta;
    for (let i = 0; i < count; i++) {
      const lifeI = life[i];
      if (elapsed > lifeI) {
        opArr[i] = 0;
        continue;
      }
      allDead = false;
      const i3 = i * 3;
      const t = elapsed / lifeI;
      posArr[i3] += vel[i3] * delta;
      posArr[i3 + 1] += vel[i3 + 1] * delta;
      posArr[i3 + 2] += vel[i3 + 2] * delta;
      vel[i3 + 1] -= gravity;
      if (posArr[i3 + 1] < OCEAN_Y && vel[i3 + 1] < 0) {
        posArr[i3 + 1] = OCEAN_Y;
        vel[i3 + 1] *= -0.3;
        vel[i3] *= 0.5;
        vel[i3 + 2] *= 0.5;
      }
      opArr[i] = 1.0 - t * t;
      sizeArr[i] = baseSizes[i] * (1.0 - t * 0.5);
    }
    const attrs = pointsRef.current.geometry.attributes;
    attrs.position.needsUpdate = true;
    attrs.size.needsUpdate = true;
    attrs.opacity.needsUpdate = true;
    if (allDead) phase.current = 'idle';
  });

  if (!active && phase.current === 'idle') return null;

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} usage={THREE.DynamicDrawUsage} />
        <bufferAttribute attach="attributes-size" count={count} array={sizes} itemSize={1} usage={THREE.DynamicDrawUsage} />
        <bufferAttribute attach="attributes-opacity" count={count} array={opacities} itemSize={1} usage={THREE.DynamicDrawUsage} />
      </bufferGeometry>
      <shaderMaterial
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexShader={SPLASH_VERTEX_SHADER}
        fragmentShader={SPLASH_FRAGMENT_SHADER}
      />
    </points>
  );
}

function WaterRipple({ active }) {
  const ringRef = useRef();
  const animRef = useRef(null);

  useEffect(() => {
    if (!active || !ringRef.current) return;
    if (animRef.current) animRef.current.pause();
    const state = { scale: 0.1, opacity: 0.8 };
    ringRef.current.scale.set(0.1, 0.1, 0.1);
    ringRef.current.material.opacity = 0.8;
    ringRef.current.visible = true;
    animRef.current = anime({
      targets: state,
      scale: 25,
      opacity: 0,
      duration: 3000,
      easing: 'easeOutQuad',
      update: () => {
        if (!ringRef.current) return;
        ringRef.current.scale.set(state.scale, state.scale, state.scale);
        ringRef.current.material.opacity = state.opacity;
      },
      complete: () => {
        if (ringRef.current) ringRef.current.visible = false;
      }
    });
    return () => { if (animRef.current) animRef.current.pause(); };
  }, [active]);

  return (
    <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, OCEAN_Y + 0.1, 0]} visible={false} frustumCulled={false}>
      <ringGeometry args={[0.8, 1.0, RIPPLE_SEGMENTS]} />
      <meshBasicMaterial color="#4da6ff" transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
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

function Ocean({ splashTrigger }) {
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
    if (splashTrigger <= splashApplied.current || !materialRef.current) return;
    splashApplied.current = splashTrigger;
    materialRef.current.uSplashTime = timeStateRef.current.value;
    materialRef.current.uSplashCenter.copy(_splashCenter);
  }, [splashTrigger]);

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
  const [splashActive, setSplashActive] = useState(false);
  const [splashTrigger, setSplashTrigger] = useState(0);
  const handleCrossWater = useCallback(() => {
    setSplashActive(true);
    setSplashTrigger(prev => prev + 1);
  }, []);
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
        <Ocean splashTrigger={splashTrigger} />
        <SplashParticles active={splashActive} />
        <WaterRipple active={splashActive} />
        <DustParticles />
      </Suspense>
      <Controls zoomed={zoomed} rotationTarget={rotationTarget} onRotationComplete={onRotationComplete} rushTarget={rushTarget} onRushComplete={onRushComplete} />
      <AdaptiveQuality />
    </>
  );
}

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
const ROOT_STYLE = {
  position: 'fixed',
  inset: 0,
  zIndex: 0,
  backgroundColor: '#000000',
  width: '100vw',
  height: '100vh',
};
const GRADIENT_STYLE = {
  position: 'absolute',
  inset: 0,
  background: 'linear-gradient(to bottom, #2a0306, #1a0205, #050102)',
  opacity: 0,
};
const CANVAS_STYLE = { width: '100vw', height: '100vh' };
const FALLBACK_CSS = `
@keyframes bgFallbackPulse {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 0.85; }
}
@keyframes bgFallbackDrift {
  0% { transform: translate(-2%, 0) scale(1.1); }
  50% { transform: translate(2%, -1%) scale(1.15); }
  100% { transform: translate(-2%, 0) scale(1.1); }
}
.bg-fallback-root {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  background: radial-gradient(ellipse at 50% 120%, #5a0a10 0%, #2a0306 35%, #120104 70%, #050102 100%);
}
.bg-fallback-glow {
  position: absolute;
  inset: -10%;
  background: radial-gradient(circle at 50% 75%, rgba(204,17,17,0.35), transparent 55%);
  animation: bgFallbackPulse 6s ease-in-out infinite;
  will-change: opacity;
}
.bg-fallback-clouds {
  position: absolute;
  inset: -15%;
  background:
    radial-gradient(closest-side at 30% 40%, rgba(160,24,24,0.18), transparent),
    radial-gradient(closest-side at 70% 30%, rgba(120,10,10,0.16), transparent),
    radial-gradient(closest-side at 50% 60%, rgba(90,6,6,0.14), transparent);
  filter: blur(8px);
  animation: bgFallbackDrift 24s ease-in-out infinite;
  will-change: transform;
}
.bg-fallback-horizon {
  position: absolute;
  left: 0; right: 0; bottom: 0;
  height: 42%;
  background: linear-gradient(to bottom, transparent, rgba(8,0,2,0.85) 60%, #050102);
}
`;

function StaticFallbackBackground() {
  return (
    <div className="bg-fallback-root">
      <style>{FALLBACK_CSS}</style>
      <div className="bg-fallback-clouds" />
      <div className="bg-fallback-glow" />
      <div className="bg-fallback-horizon" />
    </div>
  );
}

export default function AnimeBackground({ zoomed, rotationTarget, currentFace, onRotationComplete, onAboutOpen, onContactOpen, rushTarget, onRushComplete }) {
  const bgRef = useRef()
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
      <div style={ROOT_STYLE}>
        <StaticFallbackBackground />
        <ActivePanelOverlay
          currentFace={currentFace}
          visible={true}
          onAboutOpen={onAboutOpen}
          onContactOpen={onContactOpen}
        />
      </div>
    );
  }

  return (
    <div style={ROOT_STYLE}>
      <div ref={bgRef} style={GRADIENT_STYLE} />
      <Canvas
        camera={CANVAS_CAMERA}
        style={CANVAS_STYLE}
        dpr={CANVAS_DPR}
        gl={CANVAS_GL}
        performance={CANVAS_PERFORMANCE}
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
      />
    </div>
  );
}

if (!SOFTWARE_RENDER) {
  useGLTF.preload('/bg-model/source/Malevolent_shrine_webp_draco.glb');
}
