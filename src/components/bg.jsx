import React, { Suspense, useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { OrbitControls, useGLTF, shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';
import anime from 'animejs';

const OCEAN_Y = -6;

function MalevolentShrine({ zoomed, onCrossWater }) {
  const { scene } = useGLTF('/bg-model/source/Malevolent_shrine.glb');
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

  useEffect(() => {
    if (!modelRef.current) return;
    modelRef.current.position.set(offset.x, offset.y - 60, offset.z);
    isRising.current = true;
    hasCrossed.current = false;
    const finalY = offset.y;
    riseAnimRef.current = anime({
      targets: modelRef.current.position,
      y: finalY,
      duration: 5000,
      easing: 'easeOutCubic',
      update: () => {
        if (!modelRef.current || !isRising.current) return;
        const rumble = 0.15;
        modelRef.current.position.x = offset.x + (Math.random() - 0.5) * rumble;
        modelRef.current.position.z = offset.z + (Math.random() - 0.5) * rumble;
        if (!hasCrossed.current && modelRef.current.position.y >= OCEAN_Y) {
          hasCrossed.current = true;
          if (onCrossWater) onCrossWater();
        }
      },
      complete: () => {
        isRising.current = false;
        if (modelRef.current) modelRef.current.position.set(offset.x, finalY, offset.z);
      }
    });
    return () => {
      if (riseAnimRef.current) riseAnimRef.current.pause();
    };
  }, [offset, onCrossWater]);

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
  const count = 600;
  const pointsRef = useRef();
  const velocities = useRef([]);
  const lifetimes = useRef([]);
  const startTime = useRef(0);
  const phase = useRef('idle');
  const positions = useMemo(() => new Float32Array(count * 3), []);
  const sizes = useMemo(() => new Float32Array(count), []);
  const opacities = useMemo(() => new Float32Array(count), []);
  const initParticles = useCallback(() => {
    velocities.current = [];
    lifetimes.current = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 8;
      const upSpeed = 3 + Math.random() * 12;
      const radialOffset = Math.random() * 3;
      positions[i * 3] = Math.cos(angle) * radialOffset;
      positions[i * 3 + 1] = OCEAN_Y;
      positions[i * 3 + 2] = Math.sin(angle) * radialOffset;
      velocities.current.push({
        x: Math.cos(angle) * speed,
        y: upSpeed,
        z: Math.sin(angle) * speed,
      });
      lifetimes.current.push(0.8 + Math.random() * 1.5);
      sizes[i] = 0.1 + Math.random() * 0.3;
      opacities[i] = 1.0;
    }
  }, [positions, sizes, opacities]);

  useEffect(() => {
    if (active) {
      initParticles();
      phase.current = 'burst';
      startTime.current = 0;
    }
  }, [active, initParticles]);

  useFrame((state, delta) => {
    if (phase.current === 'idle' || !pointsRef.current) return;
    startTime.current += delta;
    const elapsed = startTime.current;
    let allDead = true;
    const posArr = pointsRef.current.geometry.attributes.position.array;
    const sizeArr = pointsRef.current.geometry.attributes.size.array;
    const opArr = pointsRef.current.geometry.attributes.opacity.array;
    for (let i = 0; i < count; i++) {
      const life = lifetimes.current[i];
      if (elapsed > life) {
        opArr[i] = 0;
        continue;
      }
      allDead = false;
      const t = elapsed / life;
      const vel = velocities.current[i];
      posArr[i * 3] += vel.x * delta;
      posArr[i * 3 + 1] += vel.y * delta;
      posArr[i * 3 + 2] += vel.z * delta;
      vel.y -= 15 * delta;
      if (posArr[i * 3 + 1] < OCEAN_Y && vel.y < 0) {
        posArr[i * 3 + 1] = OCEAN_Y;
        vel.y *= -0.3;
        vel.x *= 0.5;
        vel.z *= 0.5;
      }
      opArr[i] = 1.0 - t * t;
      sizeArr[i] = sizes[i] * (1.0 - t * 0.5);
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    pointsRef.current.geometry.attributes.size.needsUpdate = true;
    pointsRef.current.geometry.attributes.opacity.needsUpdate = true;
    if (allDead) {
      phase.current = 'idle';
    }
  });

  if (!active && phase.current === 'idle') return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-size" count={count} array={sizes} itemSize={1} />
        <bufferAttribute attach="attributes-opacity" count={count} array={opacities} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexShader={`
          attribute float size;
          attribute float opacity;
          varying float vOpacity;
          void main() {
            vOpacity = opacity;
            vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * (200.0 / -mvPos.z);
            gl_Position = projectionMatrix * mvPos;
          }
        `}
        fragmentShader={`
          varying float vOpacity;
          void main() {
            float d = length(gl_PointCoord - vec2(0.5));
            if (d > 0.5) discard;
            float alpha = smoothstep(0.5, 0.1, d) * vOpacity;
            gl_FragColor = vec4(0.6, 0.85, 1.0, alpha);
          }
        `}
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
    <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, OCEAN_Y + 0.1, 0]} visible={false}>
      <ringGeometry args={[0.8, 1.0, 64]} />
      <meshBasicMaterial color="#4da6ff" transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

function DustParticles() {
  const count = 10000;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 80;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 60 - 30;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }
    return pos;
  }, []);
  const pointsRef = useRef();

  useFrame((state, delta) => {
    if (pointsRef.current) {
      const positions = pointsRef.current.geometry.attributes.position.array;
      for (let i = 0; i < count; i++) {
        positions[i * 3 + 1] += delta * 8;
        positions[i * 3] += Math.sin(state.clock.elapsedTime * 2 + i) * delta * 1.5;
        positions[i * 3 + 2] += Math.cos(state.clock.elapsedTime * 2 + i) * delta * 1.5;
        if (positions[i * 3 + 1] > 40) {
          positions[i * 3 + 1] = -40;
        }
      }
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.2}
        color="#ff4422"
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
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
  `
    varying vec3 vWorldPos;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      vWorldPos = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  `
    uniform float uTime;
    uniform float uOpacity;
    uniform float uPulse;
    uniform float uFlicker;
    uniform float uFlickerPos;
    uniform vec3 uTopColor;
    uniform vec3 uHorizonColor;
    uniform vec3 uBottomColor;
    uniform vec3 uCloudColor;
    varying vec3 vWorldPos;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }
    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      for (int i = 0; i < 6; i++) {
        v += a * noise(p);
        p *= 2.0;
        a *= 0.5;
      }
      return v;
    }

    void main() {
      vec3 dir = normalize(vWorldPos);
      float h = dir.y;

      // Animated base vertical gradient with breathing horizon (pulse driven by anime.js)
      float pulse = uPulse;
      float topMix = smoothstep(0.0, 0.75, h);
      float bottomMix = smoothstep(0.0, -0.3, h);
      vec3 horizonHot = mix(uHorizonColor, vec3(0.95, 0.12, 0.08), 0.35 + pulse * 0.25);
      vec3 col = mix(horizonHot, uTopColor, topMix);
      col = mix(col, uBottomColor, bottomMix);

      // Pulsating horizon glow (the bleeding band)
      float horizonGlow = exp(-abs(h) * 3.5) * (0.55 + pulse * 0.4);
      col += vec3(0.7, 0.1, 0.06) * horizonGlow;

      // Multi-layered swirling blood clouds
      vec2 cloudUv = dir.xz / max(abs(dir.y) + 0.12, 0.12) * 1.3;
      // Domain-warp the cloud uv for turbulent, "boiling" motion
      vec2 warp = vec2(
        fbm(cloudUv * 0.9 + uTime * 0.05),
        fbm(cloudUv * 0.9 - uTime * 0.04 + 17.3)
      );
      cloudUv += (warp - 0.5) * 1.8;
      float clouds1 = fbm(cloudUv * 0.7 + uTime * 0.035);
      float clouds2 = fbm(cloudUv * 1.5 - uTime * 0.025 + 5.1);
      float clouds3 = fbm(cloudUv * 3.2 + uTime * 0.06 - 9.7);
      float clouds = clouds1 * 0.55 + clouds2 * 0.3 + clouds3 * 0.15;
      float cloudDensity = smoothstep(0.30, 0.85, clouds);

      // Dark heavy clouds overhead
      float cloudMask = smoothstep(0.02, 0.55, h) * cloudDensity;
      col = mix(col, uCloudColor, cloudMask * 0.9);

      // Bloody underglow - clouds lit from beneath at horizon
      float underglow = smoothstep(0.0, 0.5, clouds) * smoothstep(0.5, 0.05, h);
      col += vec3(0.85, 0.12, 0.08) * underglow * 0.55 * (0.7 + pulse * 0.3);

      // Hot rim-light on cloud edges (gives the "wound" look)
      float cloudEdge = smoothstep(0.50, 0.78, clouds) * smoothstep(0.05, 0.45, h);
      col += vec3(0.95, 0.18, 0.1) * cloudEdge * (0.45 + pulse * 0.35);

      // Distant lightning-like flickers (driven by anime.js: uFlicker intensity, uFlickerPos)
      float flickerBand = exp(-pow((dir.x * 0.5 + 0.5) - uFlickerPos, 2.0) * 60.0);
      col += vec3(1.0, 0.35, 0.25) * flickerBand * uFlicker * smoothstep(0.0, 0.4, h) * 0.6;

      // Subtle drifting red mist near horizon
      float mist = fbm(vec2(dir.x * 3.0 + uTime * 0.08, h * 6.0)) * exp(-abs(h) * 5.0);
      col += vec3(0.45, 0.04, 0.02) * mist * 0.4;

      // Vignette darkening at extreme top
      col *= 1.0 - smoothstep(0.65, 1.0, h) * 0.55;
      gl_FragColor = vec4(col, uOpacity);
    }
  `
);
extend({ SkyMaterial });

function BackgroundSphere() {
  const materialRef = useRef();
  const animRefs = useRef([]);

  useEffect(() => {
    if (!materialRef.current) return;
    const mat = materialRef.current;
    mat.uOpacity = 0;
    mat.uTime = 0;
    mat.uPulse = 0.5;
    mat.uFlicker = 0;
    mat.uFlickerPos = 0.5;

    // Fade-in opacity
    const fadeAnim = anime({
      targets: mat,
      uOpacity: 1.0,
      duration: 4000,
      easing: 'easeInOutQuad',
      delay: 1000,
    });

    // Continuous time uniform (drives shader cloud/wave UV scrolling)
    const timeState = { value: 0 };
    const timeAnim = anime({
      targets: timeState,
      value: 100000,
      duration: 100000 * 1000,
      easing: 'linear',
      update: () => { mat.uTime = timeState.value; },
    });

    // Horizon "breathing" pulse (sin-like 0..1 oscillation via anime.js)
    const pulseState = { value: 0 };
    const pulseAnim = anime({
      targets: pulseState,
      value: 1,
      duration: 12500, // matches old uTime*0.25 period
      direction: 'alternate',
      loop: true,
      easing: 'easeInOutSine',
      update: () => { mat.uPulse = pulseState.value; },
    });

    // Lightning flicker scheduler: triggers a brief flash at random intervals
    let cancelled = false;
    const scheduleFlicker = () => {
      if (cancelled) return;
      const delay = 1500 + Math.random() * 4000;
      setTimeout(() => {
        if (cancelled || !materialRef.current) return;
        materialRef.current.uFlickerPos = Math.random();
        const flickerState = { value: 1 };
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
      animRefs.current.forEach(a => a && a.pause());
    };
  }, []);

  return (
    <mesh position={[0, 0, 0]}>
      <sphereGeometry args={[200, 64, 64]} />
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
  `
    uniform float uTime;
    uniform vec2 uSplashCenter;
    uniform float uSplashTime;
    uniform float uSplashRadius;
    varying vec2 vUv;
    varying vec3 vWorldPos;
    varying vec3 vNormal;
    varying float vElevation;

    vec3 gerstnerWave(vec2 pos, float steepness, float wavelength, vec2 direction, float speed) {
      float k = 6.28318 / wavelength;
      float c = sqrt(9.8 / k);
      vec2 d = normalize(direction);
      float f = k * (dot(d, pos) - c * speed * uTime);
      float a = steepness / k;
      return vec3(d.x * a * cos(f), a * sin(f), d.y * a * cos(f));
    }

    float splashWave(vec2 pos) {
      float timeSinceSplash = uTime - uSplashTime;
      if (timeSinceSplash < 0.0 || timeSinceSplash > 5.0) return 0.0;
      float dist = length(pos - uSplashCenter);
      float waveSpeed = 8.0;
      float waveFront = timeSinceSplash * waveSpeed;
      float waveWidth = 3.0;
      float wave = exp(-pow(dist - waveFront, 2.0) / waveWidth);
      float amplitude = 1.5 * exp(-timeSinceSplash * 0.8) * exp(-dist * 0.05);
      return sin(dist * 2.0 - timeSinceSplash * 6.0) * wave * amplitude;
    }

    void main() {
      vUv = uv;
      vec3 pos = position;
      
      // More realistic, chaotic Gerstner waves with varied directions and speeds
      vec3 wave1 = gerstnerWave(pos.xz, 0.15, 30.0, vec2(1.0, 0.4), 0.6);
      vec3 wave2 = gerstnerWave(pos.xz, 0.12, 22.0, vec2(-0.6, 0.8), 0.7);
      vec3 wave3 = gerstnerWave(pos.xz, 0.08, 15.0, vec2(0.3, -0.9), 0.9);
      vec3 wave4 = gerstnerWave(pos.xz, 0.05, 9.0, vec2(-0.8, -0.5), 1.1);
      vec3 wave5 = gerstnerWave(pos.xz, 0.03, 5.0, vec2(0.9, 0.2), 1.3);
      vec3 wave6 = gerstnerWave(pos.xz, 0.02, 3.0, vec2(-0.2, 0.9), 1.5);
      vec3 wave7 = gerstnerWave(pos.xz, 0.01, 1.5, vec2(0.7, -0.7), 1.8);
      
      vec3 totalWave = wave1 + wave2 + wave3 + wave4 + wave5 + wave6 + wave7;
      pos += totalWave;
      float splash = splashWave(pos.xz);
      pos.y += splash;
      vElevation = totalWave.y + splash;
      
      float eps = 0.1;
      vec3 posR = position + vec3(eps, 0.0, 0.0);
      vec3 posU = position + vec3(0.0, 0.0, eps);
      
      vec3 wR = gerstnerWave(posR.xz, 0.15, 30.0, vec2(1.0, 0.4), 0.6)
              + gerstnerWave(posR.xz, 0.12, 22.0, vec2(-0.6, 0.8), 0.7)
              + gerstnerWave(posR.xz, 0.08, 15.0, vec2(0.3, -0.9), 0.9)
              + gerstnerWave(posR.xz, 0.05, 9.0, vec2(-0.8, -0.5), 1.1)
              + gerstnerWave(posR.xz, 0.03, 5.0, vec2(0.9, 0.2), 1.3)
              + gerstnerWave(posR.xz, 0.02, 3.0, vec2(-0.2, 0.9), 1.5)
              + gerstnerWave(posR.xz, 0.01, 1.5, vec2(0.7, -0.7), 1.8);
      posR += wR;
      posR.y += splashWave(posR.xz);
      
      vec3 wU = gerstnerWave(posU.xz, 0.15, 30.0, vec2(1.0, 0.4), 0.6)
              + gerstnerWave(posU.xz, 0.12, 22.0, vec2(-0.6, 0.8), 0.7)
              + gerstnerWave(posU.xz, 0.08, 15.0, vec2(0.3, -0.9), 0.9)
              + gerstnerWave(posU.xz, 0.05, 9.0, vec2(-0.8, -0.5), 1.1)
              + gerstnerWave(posU.xz, 0.03, 5.0, vec2(0.9, 0.2), 1.3)
              + gerstnerWave(posU.xz, 0.02, 3.0, vec2(-0.2, 0.9), 1.5)
              + gerstnerWave(posU.xz, 0.01, 1.5, vec2(0.7, -0.7), 1.8);
      posU += wU;
      posU.y += splashWave(posU.xz);
      
      vec3 tangent = normalize(posR - pos);
      vec3 bitangent = normalize(posU - pos);
      vNormal = normalize(cross(bitangent, tangent));
      vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  `
    uniform float uTime;
    uniform vec3 uColor;
    uniform vec3 uDeepColor;
    uniform vec3 uSurfaceColor;
    uniform vec3 uFoamColor;
    uniform float uOpacity;
    uniform vec3 uFogColor;
    uniform float uFogNear;
    uniform float uFogFar;
    uniform float uSplashTime;
    uniform vec2 uSplashCenter;
    uniform vec3 uSkyTint;
    varying vec2 vUv;
    varying vec3 vWorldPos;
    varying vec3 vNormal;
    varying float vElevation;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }
    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      for (int i = 0; i < 5; i++) {
        v += a * noise(p);
        p *= 2.0;
        a *= 0.5;
      }
      return v;
    }

    void main() {
      vec3 viewDir = normalize(cameraPosition - vWorldPos);
      
      // Enhanced Fresnel for more realistic reflections at grazing angles
      float fresnelTerm = dot(vNormal, viewDir);
      fresnelTerm = clamp(1.0 - fresnelTerm, 0.0, 1.0);
      float fresnel = pow(fresnelTerm, 4.0); // Sharper falloff

      // Normalize elevation for color mixing
      float elevNorm = smoothstep(-0.8, 0.8, vElevation);
      vec3 baseColor = mix(uDeepColor, uSurfaceColor, elevNorm);

      // Internal teal glow with more complex noise for depth
      float glowNoise = fbm(vWorldPos.xz * 0.2 + uTime * 0.15);
      float glowMask = smoothstep(0.3, 0.7, glowNoise) * (1.0 - elevNorm); // Glow more in troughs
      vec3 glowColor = vec3(0.05, 0.85, 0.65) * glowMask * 0.8;
      baseColor += glowColor;

      // Lighting setup
      vec3 lightDir = normalize(vec3(0.5, 0.8, 0.2)); // Main light direction
      vec3 halfDir = normalize(lightDir + viewDir);
      
      // Specular highlights (sun/moon reflection)
      float specAngle = max(dot(vNormal, halfDir), 0.0);
      float spec = pow(specAngle, 256.0); // Tighter, brighter specular
      vec3 specColor = mix(vec3(0.8, 1.0, 0.9), uSkyTint, 0.3) * spec * 3.0;

      // Foam generation based on elevation and noise
      float foamNoise = fbm(vWorldPos.xz * 0.8 + uTime * 0.4);
      float foamMask = smoothstep(0.4, 0.7, vElevation); // Foam on peaks
      float foam = foamMask * foamNoise;
      
      // Add splash foam
      float timeSinceSplash = uTime - uSplashTime;
      if (timeSinceSplash > 0.0 && timeSinceSplash < 5.0) {
        float dist = length(vWorldPos.xz - uSplashCenter);
        float splashFoam = exp(-dist * 0.1) * exp(-timeSinceSplash * 0.5) * 0.8;
        foam += splashFoam * fbm(vWorldPos.xz * 2.0); // Add noise to splash foam
      }
      
      // Subsurface scattering (light passing through wave peaks)
      float sss = pow(max(dot(viewDir, -lightDir), 0.0), 2.0) * elevNorm * 0.6;
      vec3 sssColor = vec3(0.0, 0.7, 0.5) * sss;

      // Combine colors
      vec3 color = baseColor;
      
      // Sky reflection
      vec3 skyReflection = mix(uSurfaceColor, uSkyTint, 0.8);
      color = mix(color, skyReflection, fresnel * 0.8);
      
      color += specColor;
      color = mix(color, uFoamColor, clamp(foam, 0.0, 1.0));
      color += sssColor;

      // Caustics (light patterns on the water surface)
      float causticNoise = fbm(vWorldPos.xz * 3.0 + uTime * 0.6);
      float causticMask = smoothstep(0.4, 0.8, causticNoise) * (1.0 - foamMask);
      color += vec3(0.1, 0.5, 0.4) * causticMask * 0.3;

      // Fog blending
      float fogDist = length(vWorldPos - cameraPosition);
      float fogFactor = smoothstep(uFogNear, uFogFar, fogDist);
      color = mix(color, uFogColor, fogFactor);

      gl_FragColor = vec4(color, uOpacity);
    }
  `
);

extend({ OceanMaterial });

function Ocean({ splashTrigger }) {
  const meshRef = useRef();
  const materialRef = useRef();
  const splashApplied = useRef(0);
  const timeStateRef = useRef({ value: 0 });
  const timeAnimRef = useRef(null);
  const { camera } = useThree();

  // Drive uTime via an anime.js linear loop instead of useFrame
  useEffect(() => {
    if (!materialRef.current) return;
    timeStateRef.current.value = 0;
    timeAnimRef.current = anime({
      targets: timeStateRef.current,
      value: 100000,
      duration: 100000 * 2500, // 0.4 units/sec to match prior elapsed*0.4
      easing: 'linear',
      update: () => {
        if (materialRef.current) materialRef.current.uTime = timeStateRef.current.value;
      },
    });
    return () => { if (timeAnimRef.current) timeAnimRef.current.pause(); };
  }, []);

  // Splash trigger via anime.js (sets splash uniforms; shader handles propagation)
  useEffect(() => {
    if (splashTrigger <= splashApplied.current || !materialRef.current) return;
    splashApplied.current = splashTrigger;
    materialRef.current.uSplashTime = timeStateRef.current.value;
    materialRef.current.uSplashCenter = new THREE.Vector2(0, 0);
  }, [splashTrigger]);

  // Camera-follow keeps the ocean effectively infinite
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.x = camera.position.x;
      meshRef.current.position.z = camera.position.z;
    }
  });

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, OCEAN_Y, 0]}
    >
      <planeGeometry args={[4000, 4000, 512, 512]} />
      <oceanMaterial
        ref={materialRef}
        transparent
        side={THREE.DoubleSide}
        depthWrite={true}
        uFogNear={60}
        uFogFar={260}
      />
    </mesh>
  );
}

function Controls({ zoomed }) {
  const { camera, gl } = useThree();
  const controlsRef = useRef();
  const tweenStateRef = useRef({ targetY: 0, distance: 90 });
  const animRef = useRef(null);

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
        if (!controlsRef.current) return;
        controlsRef.current.target.y = tweenStateRef.current.targetY;
        const direction = camera.position.clone().sub(controlsRef.current.target).normalize();
        camera.position.copy(controlsRef.current.target).add(direction.multiplyScalar(tweenStateRef.current.distance));
        controlsRef.current.minDistance = tweenStateRef.current.distance;
        controlsRef.current.maxDistance = tweenStateRef.current.distance;
        controlsRef.current.update();
      },
    });
    return () => { if (animRef.current) animRef.current.pause(); };
  }, [zoomed, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      args={[camera, gl.domElement]}
      enablePan={false}
      enableZoom={false}
      minPolarAngle={Math.PI / 2.2}
      maxPolarAngle={Math.PI / 2.2}
    />
  );
}

function SceneContent({ zoomed }) {
  const [splashActive, setSplashActive] = useState(false);
  const [splashTrigger, setSplashTrigger] = useState(0);
  const handleCrossWater = useCallback(() => {
    setSplashActive(true);
    setSplashTrigger(prev => prev + 1);
  }, []);

  return (
    <>
      <fog attach="fog" args={['#1a0306', 80, 280]} />
      <ambientLight intensity={1.0} color="#ffffff" />
      <directionalLight position={[15, 15, 15]} intensity={3.5} color="#ffffff" />
      <directionalLight position={[-15, 10, -15]} intensity={1.5} color="#ffffff" />
      <pointLight position={[0, -4, 0]} intensity={2.5} color="#1affd0" distance={40} decay={2} />
      <Suspense fallback={null}>
        <BackgroundSphere />
        <MalevolentShrine zoomed={zoomed} onCrossWater={handleCrossWater} />
        <Ocean splashTrigger={splashTrigger} />
        <SplashParticles active={splashActive} />
        <WaterRipple active={splashActive} />
        <DustParticles />
      </Suspense>
      <Controls zoomed={zoomed} />
    </>
  );
}

export default function AnimeBackground({ zoomed }) {
  const bgRef = useRef();
  useEffect(() => {
    if (bgRef.current) {
      anime({
        targets: bgRef.current,
        opacity: [0, 1],
        duration: 4000,
        easing: 'easeInOutQuad',
        delay: 1000
      });
    }
  }, []);

  return (
    <div className="fixed inset-0 z-0 bg-[#000000] w-screen h-screen">
      <div ref={bgRef} className="absolute inset-0 bg-gradient-to-b from-[#2a0306] via-[#1a0205] to-[#050102] opacity-0" />
      <Canvas camera={{ position: [0, 20, 90], fov: 10 }} style={{ width: '100vw', height: '100vh' }}>
        <SceneContent zoomed={zoomed} />
      </Canvas>
    </div>
  );
}
