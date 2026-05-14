import React, { Suspense, useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { OrbitControls, useGLTF, shaderMaterial, Html } from '@react-three/drei';
import { oceanVertexShader, oceanFragmentShader, skyVertexShader, skyFragmentShader } from './shaders';
import Panel from './panels';
import * as THREE from 'three';
import anime from 'animejs';
import ActivePanelOverlay from './panels';

const OCEAN_Y = -6;

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
        if (onShrineArrived) onShrineArrived();
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
  skyVertexShader,
  skyFragmentShader
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
    materialRef.current.uSplashCenter = new THREE.Vector2(0, 0);
  }, [splashTrigger]);

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

function Controls({ zoomed, rotationTarget, onRotationComplete, rushTarget, onRushComplete }) {
  const { camera, gl } = useThree();
  const controlsRef = useRef();
  const tweenStateRef = useRef({ targetY: 0, distance: 90 });
  const animRef = useRef(null);
  const rotationAnimRef = useRef(null);
  const rushAnimRef = useRef(null);
  const midpointCalledRef = useRef(false);

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
        if (!controlsRef.current) return;
        const spherical = new THREE.Spherical();
        spherical.setFromVector3(camera.position.clone().sub(controlsRef.current.target));
        spherical.theta = rotationState.value;
        camera.position.copy(controlsRef.current.target).add(new THREE.Vector3().setFromSpherical(spherical));
        controlsRef.current.update();
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
        if (!controlsRef.current || !camera) return;
        controlsRef.current.target.y = 0;
        const direction = camera.position.clone().sub(controlsRef.current.target).normalize();
        camera.position.copy(controlsRef.current.target).add(direction.multiplyScalar(rushState.distance));
        controlsRef.current.minDistance = rushState.distance;
        controlsRef.current.maxDistance = rushState.distance;
        controlsRef.current.update();
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

function SceneContent({ zoomed, rotationTarget, onRotationComplete, onAboutOpen, rushTarget, onRushComplete }) {
  const [splashActive, setSplashActive] = useState(false);
  const [splashTrigger, setSplashTrigger] = useState(0);
  const [shrineArrived, setShrineArrived] = useState(false);
  const handleCrossWater = useCallback(() => {
    setSplashActive(true);
    setSplashTrigger(prev => prev + 1);
  }, []);
  const handleShrineArrived = useCallback(() => {
    setShrineArrived(true);
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
        <Shrine zoomed={zoomed} onCrossWater={handleCrossWater} onShrineArrived={handleShrineArrived} />
        <Ocean splashTrigger={splashTrigger} />
        <SplashParticles active={splashActive} />
        <WaterRipple active={splashActive} />
        <DustParticles />
      </Suspense>
      <Controls zoomed={zoomed} rotationTarget={rotationTarget} onRotationComplete={onRotationComplete} rushTarget={rushTarget} onRushComplete={onRushComplete} />
    </>
  );
}

export default function AnimeBackground({ zoomed, rotationTarget, currentFace, onRotationComplete, onAboutOpen, rushTarget, onRushComplete }) {
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
        <SceneContent zoomed={zoomed} rotationTarget={rotationTarget} onRotationComplete={onRotationComplete} onAboutOpen={onAboutOpen} rushTarget={rushTarget} onRushComplete={onRushComplete} />
      </Canvas>
      <ActivePanelOverlay 
         currentFace={currentFace} 
         visible={true} 
         onAboutOpen={onAboutOpen} 
      />
    </div>
  );
}

useGLTF.preload('/bg-model/source/Malevolent_shrine_webp_draco.glb');
