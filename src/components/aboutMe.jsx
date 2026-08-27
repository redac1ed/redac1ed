import { useEffect, useRef, useState } from 'react';
import anime from 'animejs';
import * as CANNON from 'cannon-es';
import { ArrowLeft, X } from 'lucide-react';

export default function AboutMeOverlay({ onClose, isAnimatingIn, isAnimatingOut, onOutComplete }) {
  const cards = [
    { id: 'about', title: 'About Me', subtitle: 'redac1ed', description: 'Hear out my story and how I became a teenage web developer!', fullContent: 'Passionate about React, Three.js, and pushing the limits of what a browser can render.', color: '#cc5f11', bgImage: '/intro.png' },
    { id: 'likes', title: 'Things I Like', subtitle: 'Things I Like', description: 'Things that inspire me', fullContent: 'My interests and passions', color: '#4182dd', bgImage: '/likes.png' },
    { id: 'other', subtitle: 'Other stuff', description: 'More about me', fullContent: 'Additional interests and hobbies', color: '#1b0a32', bgImage: '/other.png' },
  ];
  const overlayRef = useRef();
  const bgRef = useRef();
  const halftoneVideoRef = useRef();
  const halftoneCanvasRef = useRef();
  const halftoneRafRef = useRef(null);
  const containerRef = useRef();
  const stageRef = useRef();
  const cardRefs = useRef([]);
  const stringRefs = useRef([]);
  const chainCanvasRef = useRef();
  const animRef = useRef(null);
  const bgAnimRef = useRef(null);
  const rafRef = useRef(null);
  const simRef = useRef([]);
  const dragRef = useRef(null);
  const suppressClickRef = useRef(false);
  const worldRef = useRef(null);
  const jointBodyRef = useRef(null);
  const dragConstraintRef = useRef(null);
  const activeUntilRef = useRef(0);
  const [introDone, setIntroDone] = useState(false);
  const [selectedCardIndex, setSelectedCardIndex] = useState(null);
  const moveAnimsRef = useRef([]);
  const stopBubble = (e) => e.stopPropagation();
  const r = (hex) => parseInt(hex.slice(1, 3), 16);
  const g = (hex) => parseInt(hex.slice(3, 5), 16);
  const b = (hex) => parseInt(hex.slice(5, 7), 16);

  useEffect(() => {
    if (!containerRef.current || !overlayRef.current || !bgRef.current) return;
    if (animRef.current) animRef.current.pause();
    if (bgAnimRef.current) bgAnimRef.current.pause();
    if (isAnimatingIn) {
      animRef.current = anime({
        targets: containerRef.current,
        opacity: [0, 1],
        duration: 300,
        easing: 'easeInOutCubic',
        complete: () => setIntroDone(true),
      });
      bgAnimRef.current = anime({
        targets: [overlayRef.current, bgRef.current],
        opacity: [0, 1], duration: 300, easing: 'easeInOutCubic',
      });
    } else if (isAnimatingOut) {
      animRef.current = anime({
        targets: containerRef.current,
        opacity: [1, 0], duration: 500, easing: 'easeInOutCubic',
        complete: () => { if (onOutComplete) onOutComplete(); },
      });
      bgAnimRef.current = anime({
        targets: [overlayRef.current, bgRef.current],
        opacity: [1, 0], duration: 500, easing: 'easeInOutCubic',
      });
    } else {
      containerRef.current.style.opacity = '1';
      overlayRef.current.style.opacity = '1';
      bgRef.current.style.opacity = '1';
      setIntroDone(true);
    }
    return () => {
      if (animRef.current) animRef.current.pause();
      if (bgAnimRef.current) bgAnimRef.current.pause();
    };
  }, [isAnimatingIn, isAnimatingOut, onOutComplete]);

  useEffect(() => {
    const video = halftoneVideoRef.current;
    const canvas = halftoneCanvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext('2d');
    const sample = document.createElement('canvas');
    const sctx = sample.getContext('2d', { willReadFrequently: true });
    const DOT_SPACING = 10;
    const FRAME_MS = 1000 / 30;
    const BRIGHTNESS = 0.45;
    const FLUID_RADIUS = 10;
    const DYE_DECAY = 0.988;
    const FLOW_DAMPING = 0.94;
    const CURL_STRENGTH = 0.1;
    let W = 0, H = 0, cols = 0, rows = 0;
    let lastDraw = 0;
    let dye = new Float32Array(0);
    let nextDye = new Float32Array(0);
    let flowX = new Float32Array(0);
    let flowY = new Float32Array(0);
    let nextFlowX = new Float32Array(0);
    let nextFlowY = new Float32Array(0);
    let hoverPointerX = 0;
    let hoverPointerY = 0;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let lastPointerAt = 0;
    let pointerVelocityX = 0;
    let pointerVelocityY = 0;
    let pointerInside = false;
    let pointerSeen = false;
    let fluidSettled = false;
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W;
      canvas.height = H;
      cols = Math.ceil(W / DOT_SPACING);
      rows = Math.ceil(H / DOT_SPACING);
      sample.width = cols;
      sample.height = rows;
      const cellCount = cols * rows;
      dye = new Float32Array(cellCount);
      nextDye = new Float32Array(cellCount);
      flowX = new Float32Array(cellCount);
      flowY = new Float32Array(cellCount);
      nextFlowX = new Float32Array(cellCount);
      nextFlowY = new Float32Array(cellCount);
    };
    const sampleField = (field, x, y) => {
      const sampleX = clamp(x, 0, cols - 1);
      const sampleY = clamp(y, 0, rows - 1);
      const x0 = Math.floor(sampleX);
      const y0 = Math.floor(sampleY);
      const x1 = Math.min(cols - 1, x0 + 1);
      const y1 = Math.min(rows - 1, y0 + 1);
      const tx = sampleX - x0;
      const ty = sampleY - y0;
      const top = field[y0 * cols + x0] * (1 - tx) + field[y0 * cols + x1] * tx;
      const bottom = field[y1 * cols + x0] * (1 - tx) + field[y1 * cols + x1] * tx;
      return top * (1 - ty) + bottom * ty;
    };
    const onPointerMove = (event) => {
      const pointerX = event.clientX / DOT_SPACING;
      const pointerY = event.clientY / DOT_SPACING;
      const now = performance.now();
      if (pointerSeen && now - lastPointerAt < 120) {
        pointerVelocityX = clamp(pointerX - lastPointerX, -2.6, 2.6);
        pointerVelocityY = clamp(pointerY - lastPointerY, -2.6, 2.6);
      } else {
        pointerVelocityX = 0;
        pointerVelocityY = 0;
      }
      hoverPointerX = pointerX;
      hoverPointerY = pointerY;
      lastPointerX = pointerX;
      lastPointerY = pointerY;
      lastPointerAt = now;
      pointerInside = true;
      pointerSeen = true;
    };
    const resetPointer = () => {
      pointerInside = false;
      pointerSeen = false;
      pointerVelocityX = 0;
      pointerVelocityY = 0;
    };
    const stepFluid = (time) => {
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const index = y * cols + x;
          const backX = x - flowX[index] * 0.65;
          const backY = y - flowY[index] * 0.65;
          const left = x > 0 ? index - 1 : index;
          const right = x < cols - 1 ? index + 1 : index;
          const top = y > 0 ? index - cols : index;
          const bottom = y < rows - 1 ? index + cols : index;
          const neighborFlowX = (flowX[left] + flowX[right] + flowX[top] + flowX[bottom]) * 0.25;
          const neighborFlowY = (flowY[left] + flowY[right] + flowY[top] + flowY[bottom]) * 0.25;
          const curlWeight = 0.15 + dye[index] * 0.85;
          const curlX = Math.sin(y * 0.24 + time * 1.1) * Math.cos(x * 0.15 - time * 0.7);
          const curlY = -Math.cos(x * 0.22 - time * 0.9) * Math.sin(y * 0.17 + time * 0.55);
          nextFlowX[index] = clamp(
            (sampleField(flowX, backX, backY) * 0.88 + neighborFlowX * 0.12) * FLOW_DAMPING
              + curlX * CURL_STRENGTH * curlWeight,
            -2.4,
            2.4,
          );
          nextFlowY[index] = clamp(
            (sampleField(flowY, backX, backY) * 0.88 + neighborFlowY * 0.12) * FLOW_DAMPING
              + curlY * CURL_STRENGTH * curlWeight,
            -2.4,
            2.4,
          );
        }
      }
      let maxDye = 0;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const index = y * cols + x;
          const left = x > 0 ? index - 1 : index;
          const right = x < cols - 1 ? index + 1 : index;
          const top = y > 0 ? index - cols : index;
          const bottom = y < rows - 1 ? index + cols : index;
          const neighborDye = (dye[left] + dye[right] + dye[top] + dye[bottom]) * 0.25;
          const backX = x - nextFlowX[index] * 0.9;
          const backY = y - nextFlowY[index] * 0.9;
          const value = clamp(
            (sampleField(dye, backX, backY) * 0.9 + neighborDye * 0.1) * DYE_DECAY,
            0,
            1,
          );
          nextDye[index] = value;
          if (value > maxDye) maxDye = value;
        }
      }
      [flowX, nextFlowX] = [nextFlowX, flowX];
      [flowY, nextFlowY] = [nextFlowY, flowY];
      [dye, nextDye] = [nextDye, dye];
      fluidSettled = !pointerInside && maxDye < 0.004;
    };
    const injectFluid = () => {
      if (!pointerInside) return;
      const motion = Math.hypot(pointerVelocityX, pointerVelocityY);
      const minX = Math.max(0, Math.floor(hoverPointerX - FLUID_RADIUS));
      const maxX = Math.min(cols - 1, Math.ceil(hoverPointerX + FLUID_RADIUS));
      const minY = Math.max(0, Math.floor(hoverPointerY - FLUID_RADIUS));
      const maxY = Math.min(rows - 1, Math.ceil(hoverPointerY + FLUID_RADIUS));
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const dx = x + 0.5 - hoverPointerX;
          const dy = y + 0.5 - hoverPointerY;
          const distance = Math.hypot(dx, dy);
          if (distance >= FLUID_RADIUS) continue;
          const falloff = 1 - distance / FLUID_RADIUS;
          const influence = falloff * falloff;
          const index = y * cols + x;
          const swirl = distance > 0 ? motion * 0.12 / distance : 0;
          dye[index] = clamp(dye[index] + (0.07 + motion * 0.05) * influence, 0, 1);
          flowX[index] = clamp(
            flowX[index] + (pointerVelocityX * 0.35 - dy * swirl) * influence,
            -2.4,
            2.4,
          );
          flowY[index] = clamp(
            flowY[index] + (pointerVelocityY * 0.35 + dx * swirl) * influence,
            -2.4,
            2.4,
          );
        }
      }
      pointerVelocityX *= 0.82;
      pointerVelocityY *= 0.82;
    };
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerleave', resetPointer);
    window.addEventListener('blur', resetPointer);
    const draw = (now) => {
      halftoneRafRef.current = requestAnimationFrame(draw);
      if (now - lastDraw < FRAME_MS) return;
      lastDraw = now;
      if (video.readyState < 2 || video.videoWidth === 0) return;
      const vAspect = video.videoWidth / video.videoHeight;
      const sAspect = cols / rows;
      let sw, sh, sx, sy;
      if (vAspect > sAspect) {
        sh = video.videoHeight; sw = sh * sAspect;
        sx = (video.videoWidth - sw) / 2; sy = 0;
      } else {
        sw = video.videoWidth; sh = sw / sAspect;
        sx = 0; sy = (video.videoHeight - sh) / 2;
      }
      sctx.drawImage(video, sx, sy, sw, sh, 0, 0, cols, rows);
      let data;
      try {
        data = sctx.getImageData(0, 0, cols, rows).data;
      } catch {
        return;
      }
      ctx.clearRect(0, 0, W, H);
      const maxR = DOT_SPACING / 2 * 1.42;
      if (pointerInside || !fluidSettled) {
        stepFluid(now * 0.001);
        injectFluid();
      }
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const idx = (y * cols + x) * 4;
          const fieldIndex = y * cols + x;
          const lum = ((data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114) / 255) * BRIGHTNESS;
          const r = lum * maxR;
          if (r < 0.35) continue;
          const dyeStrength = clamp(dye[fieldIndex] * 1.2, 0, 1);
          if (dyeStrength > 0) {
            const cr = Math.round(191 + (239 - 191) * dyeStrength);
            const cg = Math.round(191 + (35 - 191) * dyeStrength);
            const cb = Math.round(191 + (60 - 191) * dyeStrength);
            ctx.fillStyle = `rgb(${cr}, ${cg}, ${cb})`;
          } else {
            ctx.fillStyle = '#bfbfbf';
          }
          ctx.beginPath();
          ctx.arc(x * DOT_SPACING + DOT_SPACING / 2, y * DOT_SPACING + DOT_SPACING / 2, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };
    halftoneRafRef.current = requestAnimationFrame(draw);
    const playPromise = video.play();
    if (playPromise && playPromise.catch) playPromise.catch(() => {});
    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', resetPointer);
      window.removeEventListener('blur', resetPointer);
      if (halftoneRafRef.current) cancelAnimationFrame(halftoneRafRef.current);
    };
  }, []);

  useEffect(() => {
    if (!introDone) return;
    const stage = stageRef.current;
    const canvas = chainCanvasRef.current;
    const els = cardRefs.current.filter(Boolean);
    if (!stage || !canvas || els.length === 0) return;
    const rect = stage.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const cctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = els.length;
    const strokeLinkRing = (rx, ry, tube, arcFrom, arcTo) => {
      cctx.strokeStyle = '#141418';
      cctx.lineWidth = tube + 2.4;
      cctx.beginPath();
      cctx.ellipse(0, 0, rx, ry, 0, arcFrom, arcTo);
      cctx.stroke();
      const grad = cctx.createLinearGradient(0, -ry - tube, 0, ry + tube);
      grad.addColorStop(0.00, '#ffffff');
      grad.addColorStop(0.16, '#f2f3f6');
      grad.addColorStop(0.40, '#c4c6cd');
      grad.addColorStop(0.58, '#84868f');
      grad.addColorStop(0.80, '#4c4d55');
      grad.addColorStop(0.94, '#2b2b31');
      grad.addColorStop(1.00, '#6b6c74'); 
      cctx.strokeStyle = grad;
      cctx.lineWidth = tube;
      cctx.beginPath();
      cctx.ellipse(0, 0, rx, ry, 0, arcFrom, arcTo);
      cctx.stroke();
      cctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
      cctx.lineWidth = tube * 0.24;
      cctx.beginPath();
      cctx.ellipse(0, -tube * 0.24, rx, ry, 0, Math.PI * 1.06, Math.PI * 1.94);
      cctx.stroke();
      cctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
      cctx.lineWidth = tube * 0.22;
      cctx.beginPath();
      cctx.ellipse(0, tube * 0.2, rx, ry, 0, Math.PI * 0.1, Math.PI * 0.9);
      cctx.stroke();
    };
    const drawChainLink = (p1, p2, faceOn) => {
      const dx = p2.x - p1.x, dy = p2.y - p1.y;
      const len = Math.hypot(dx, dy) || 0.0001;
      const angle = Math.atan2(dy, dx);
      const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
      const rx = len * 0.74;
      const ry = faceOn ? len * 0.42 : len * 0.12;
      const tube = Math.max(2.8, Math.min(len * 0.19, 7.5));
      cctx.save();
      cctx.translate(mx, my);
      cctx.rotate(angle);
      cctx.lineCap = 'round';
      cctx.lineJoin = 'round';
      cctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      cctx.shadowBlur = 5;
      cctx.shadowOffsetX = 1.5;
      cctx.shadowOffsetY = 3;
      strokeLinkRing(rx, ry, tube, 0, Math.PI * 2);
      cctx.shadowColor = 'transparent';
      cctx.shadowBlur = 0; cctx.shadowOffsetX = 0; cctx.shadowOffsetY = 0;
      if (faceOn && ry > 3) {
        cctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        cctx.lineWidth = 1.4;
        cctx.beginPath();
        cctx.ellipse(0, 0.6, rx - tube * 0.62, ry - tube * 0.62, 0, 0, Math.PI * 2);
        cctx.stroke();
      }
      cctx.restore();
    };
    const drawChain = (pts) => {
      for (let i = 0; i < pts.length - 1; i += 2) {
        drawChainLink(pts[i], pts[i + 1], false);
      }
      for (let i = 1; i < pts.length - 1; i += 2) {
        drawChainLink(pts[i], pts[i + 1], true);
      }
    };
    const world = new CANNON.World();
    world.gravity.set(0, 2600, 0);
    world.solver.iterations = 50;
    world.solver.tolerance = 0.01;
    worldRef.current = world;
    const mat = new CANNON.Material('card');
    world.addContactMaterial(new CANNON.ContactMaterial(mat, mat, {
      friction: 0.1,
      restitution: 0.05,
      contactEquationStiffness: 1e9,
      contactEquationRelaxation: 3,
    }));
    const LINK_PX = 34;
    const CHAIN_LINK_MASS = 0.2;
    const CARD_MASS = 1.0;
    const CARD_GROUP = 1;
    simRef.current = els.map((el, i) => {
      const w = el.offsetWidth || 200;
      const h = el.offsetHeight || 240;
      const anchorX = rect.width * ((i + 1) / (n + 1));
      const anchorY = 20;
      const len = i % 2 === 0 ? rect.height * 0.22 : rect.height * 0.42;
      const linkCount = Math.max(3, Math.round(len / LINK_PX));
      el.style.visibility = 'visible';
      const dropAngle = (Math.random() * 0.5 + 0.35) * (Math.random() < 0.5 ? 1 : -1);
      const startTopY = -(h + 120);
      const dxStep = Math.sin(dropAngle) * LINK_PX;
      const dyStep = Math.cos(dropAngle) * LINK_PX;
      const chainGroup = 1 << (1 + (i % 28));
      const anchor = new CANNON.Body({ mass: 0 });
      anchor.position.set(anchorX, anchorY, 0);
      world.addBody(anchor);
      let prev = anchor;
      let cx = anchorX, cy = startTopY;
      const links = [];
      for (let k = 0; k < linkCount; k++) {
        cx += dxStep;
        cy += dyStep;
        const body = new CANNON.Body({
          mass: CHAIN_LINK_MASS,
          shape: new CANNON.Sphere(LINK_PX * 0.35),
          material: mat,
          linearDamping: 0.9,
          angularDamping: 0.9,
          collisionFilterGroup: chainGroup,
          collisionFilterMask: chainGroup,
        });
        body.position.set(cx, cy, 0);
        world.addBody(body);
        links.push(body);
        const rodConstraint = new CANNON.PointToPointConstraint(
          prev, new CANNON.Vec3(0, prev === anchor ? 0 : LINK_PX / 2, 0),
          body, new CANNON.Vec3(0, -LINK_PX / 2, 0),
        );
        rodConstraint.collideConnected = false;
        world.addConstraint(rodConstraint);
        prev = body;
      }
      cx += Math.sin(dropAngle) * (h / 2 + LINK_PX / 2);
      cy += Math.cos(dropAngle) * (h / 2 + LINK_PX / 2);
      const cardBody = new CANNON.Body({
        mass: CARD_MASS,
        shape: new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, 17)),
        material: mat,
        linearDamping: 0.85,
        angularDamping: 0.85,
        collisionFilterGroup: CARD_GROUP | chainGroup,
        collisionFilterMask: CARD_GROUP | chainGroup,
      });
      cardBody.position.set(cx, cy, 0);
      world.addBody(cardBody);
      const cardConstraint = new CANNON.PointToPointConstraint(
        prev, new CANNON.Vec3(0, LINK_PX / 2, 0),
        cardBody, new CANNON.Vec3(0, -h / 2, 0),
      );
      cardConstraint.collideConnected = false;
      world.addConstraint(cardConstraint);
      cardBody.angularVelocity.set(0, (Math.random() * 6 + 4) * (Math.random() < 0.5 ? 1 : -1), 0);
      const chainReach = linkCount * LINK_PX;
      const maxReach = chainReach + h;
      return {
        el,
        w,
        h,
        anchorX,
        anchorY,
        homeAnchorX: anchorX,
        homeAnchorY: anchorY,
        anchor,
        links,
        cardBody,
        chainPts: [],
        chainReach,
        maxReach,
      };
    });
    const jointBody = new CANNON.Body({ mass: 0 });
    jointBody.collisionFilterGroup = 0;
    jointBody.collisionFilterMask = 0;
    world.addBody(jointBody);
    jointBodyRef.current = jointBody;
    const quatToMatrix3d = (q) => {
      const x = -q.x, y = -q.y, z = q.z, w = q.w;
      const x2 = x + x, y2 = y + y, z2 = z + z;
      const xx = x * x2, xy = x * y2, xz = x * z2;
      const yy = y * y2, yz = y * z2, zz = z * z2;
      const wx = w * x2, wy = w * y2, wz = w * z2;
      const m11 = 1 - (yy + zz), m12 = xy - wz, m13 = xz + wy;
      const m21 = xy + wz, m22 = 1 - (xx + zz), m23 = yz - wx;
      const m31 = xz - wy, m32 = yz + wx, m33 = 1 - (xx + yy);
      return `matrix3d(${m11},${m21},${m31},0,${m12},${m22},${m32},0,${m13},${m23},${m33},0,0,0,0,1)`;
    };
    const render = () => {
      cctx.clearRect(0, 0, rect.width, rect.height);
      simRef.current.forEach((c) => {
        const p = c.cardBody.position;
        c.el.style.left = `${p.x - c.w / 2}px`;
        c.el.style.top = `${p.y - c.h / 2}px`;
        c.el.style.transform = `perspective(1100px) ${quatToMatrix3d(c.cardBody.quaternion)}`;
        const pts = c.chainPts;
        pts.length = 0;
        pts.push({ x: c.anchorX, y: c.anchorY });
        c.links.forEach((l) => pts.push({ x: l.position.x, y: l.position.y }));
        const top = new CANNON.Vec3();
        c.cardBody.pointToWorldFrame(new CANNON.Vec3(0, -c.h / 2, 0), top);
        pts.push({ x: top.x, y: top.y });
        drawChain(pts);
      });
    };
    const identity = new CANNON.Quaternion(0, 0, 0, 1);
    const invQ = new CANNON.Quaternion();
    const applyRestoringTorque = () => {
      const draggedIndex = dragRef.current ? dragRef.current.i : -1;
      simRef.current.forEach((c, i) => {
        if (i === draggedIndex) return;
        const body = c.cardBody;
        const speed = body.velocity.length() + body.angularVelocity.length() * 40;
        if (speed > 260) return;
        body.quaternion.conjugate(invQ);
        const dq = identity.mult(invQ);
        let angle = 2 * Math.acos(Math.max(-1, Math.min(1, dq.w)));
        if (angle > Math.PI) angle -= Math.PI * 2;
        const s = Math.sqrt(1 - dq.w * dq.w);
        if (s > 1e-4 && Math.abs(angle) > 1e-3) {
          const ax = dq.x / s, ay = dq.y / s, az = dq.z / s;
          const K = 34;
          const D = 6;
          body.angularVelocity.x += (ax * angle * K - body.angularVelocity.x * D) * (1 / 120);
          body.angularVelocity.y += (ay * angle * K - body.angularVelocity.y * D) * (1 / 120);
          body.angularVelocity.z += (az * angle * K - body.angularVelocity.z * D) * (1 / 120);
          body.wakeUp();
        }
      });
    };
    let last = performance.now() / 1000;
    let restStreak = 0;
    let sleeping = false;
    const REST_SPEED_SQ = 4;
    const REST_FRAMES = 24;
    const step = () => {
      const nowMs = performance.now();
      const now = nowMs / 1000;
      let dt = now - last;
      last = now;
      if (dt > 0.05) dt = 0.05;
      const forcedActive = Boolean(dragRef.current) || nowMs < activeUntilRef.current;
      let maxSpeedSq = 0;
      const bodies = world.bodies;
      for (let i = 0; i < bodies.length; i++) {
        const bd = bodies[i];
        if (bd.mass === 0) continue;
        const v = bd.velocity;
        const av = bd.angularVelocity;
        const s = v.x * v.x + v.y * v.y + v.z * v.z
          + (av.x * av.x + av.y * av.y + av.z * av.z) * 1600;
        if (s > maxSpeedSq) maxSpeedSq = s;
      }
      if (forcedActive || maxSpeedSq > REST_SPEED_SQ) {
        restStreak = 0;
      } else {
        restStreak++;
      }
      if (forcedActive || restStreak < REST_FRAMES) {
        applyRestoringTorque();
        world.step(1 / 120, dt, 6);
        render();
        sleeping = false;
      } else if (!sleeping) {
        render();
        sleeping = true;
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      moveAnimsRef.current.forEach((a) => a && a.pause());
      moveAnimsRef.current = [];
      worldRef.current = null;
      jointBodyRef.current = null;
    };
  }, [introDone]);

  useEffect(() => {
    if (!introDone) return;
    const stage = stageRef.current;
    if (!stage) return;
    const onMove = (e) => {
      const drag = dragRef.current;
      if (!drag) return;
      const rect = stage.getBoundingClientRect();
      const joint = jointBodyRef.current;
      if (!joint) return;
      let px = e.clientX - rect.left;
      let py = e.clientY - rect.top;
      const c = simRef.current[drag.i];
      if (c) {
        const dx = px - c.anchorX;
        const dy = py - c.anchorY;
        const dist = Math.hypot(dx, dy);
        if (dist > drag.maxReach) {
          const s = drag.maxReach / dist;
          px = c.anchorX + dx * s;
          py = c.anchorY + dy * s;
        }
      }
      joint.position.set(px, py, 0);
      drag.moved = true;
    };
    const onUp = () => {
      const drag = dragRef.current;
      if (!drag) return;
      const world = worldRef.current;
      if (world && dragConstraintRef.current) {
        world.removeConstraint(dragConstraintRef.current);
        dragConstraintRef.current = null;
      }
      suppressClickRef.current = drag.moved;
      dragRef.current = null;
      activeUntilRef.current = performance.now() + 1500;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [introDone]);

  const beginDrag = (i, e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    suppressClickRef.current = false;
    const c = simRef.current[i];
    const world = worldRef.current;
    const joint = jointBodyRef.current;
    if (!c || !world || !joint) return;
    const rect = stageRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    joint.position.set(px, py, 0);
    const worldPoint = new CANNON.Vec3(px, py, 0);
    const localPivot = new CANNON.Vec3();
    c.cardBody.pointToLocalFrame(worldPoint, localPivot);
    const attachmentToGrab = Math.hypot(localPivot.x, localPivot.y + c.h / 2, localPivot.z);
    const constraint = new CANNON.PointToPointConstraint(c.cardBody, localPivot, joint, new CANNON.Vec3(0, 0, 0));
    world.addConstraint(constraint);
    dragConstraintRef.current = constraint;
    c.cardBody.wakeUp();
    dragRef.current = {
      i,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      maxReach: c.chainReach + attachmentToGrab,
    };
  };

  const selectCard = (index) => {
    const sims = simRef.current;
    const stage = stageRef.current;
    if (!sims || sims.length === 0 || !stage || selectedCardIndex !== null) return;
    const width = stage.getBoundingClientRect().width;
    const n = sims.length;
    const rightX = width * (n / (n + 1));
    setSelectedCardIndex(index);
    activeUntilRef.current = performance.now() + 1100;
    moveAnimsRef.current.forEach((a) => a && a.pause());
    moveAnimsRef.current = sims.map((c, i) => {
      if (i === index) {
        const state = { x: c.anchorX };
        return anime({
          targets: state,
          x: rightX,
          duration: 900,
          easing: 'easeInOutCubic',
          update: () => {
            c.anchorX = state.x;
            c.anchor.position.x = state.x;
            c.links.forEach((l) => l.wakeUp());
            c.cardBody.wakeUp();
          },
        });
      }
      const state = { y: c.anchorY };
      return anime({
        targets: state,
        y: -(c.maxReach + 80),
        duration: 800,
        easing: 'easeInCubic',
        update: () => {
          c.anchorY = state.y;
          c.anchor.position.y = state.y;
          c.links.forEach((l) => l.wakeUp());
          c.cardBody.wakeUp();
        },
      });
    });
  };

  const restoreCards = () => {
    const sims = simRef.current;
    if (!sims || sims.length === 0) return;
    setSelectedCardIndex(null);
    activeUntilRef.current = performance.now() + 1100;
    moveAnimsRef.current.forEach((a) => a && a.pause());
    moveAnimsRef.current = sims.map((c) => {
      const state = { x: c.anchorX, y: c.anchorY };
      return anime({
        targets: state,
        x: c.homeAnchorX,
        y: c.homeAnchorY,
        duration: 900,
        easing: 'easeOutCubic',
        update: () => {
          c.anchorX = state.x;
          c.anchorY = state.y;
          c.anchor.position.set(state.x, state.y, 0);
          c.links.forEach((l) => l.wakeUp());
          c.cardBody.wakeUp();
        },
      });
    });
  };

  const handleCardClick = (index, e) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    selectCard(index);
  };

  const renderCard = (card, index) => {
    const hasBg = Boolean(card.bgImage);
    return (
      <div
        key={card.id}
        ref={(el) => { cardRefs.current[index] = el; }}
        className="hang-card"
        onPointerDown={(e) => beginDrag(index, e)}
        onClick={(e) => handleCardClick(index, e)}
      >
        <div className="hang-card-bracket" />
        <div className="card-edge card-edge-top" />
        <div className="card-edge card-edge-bottom" />
        <div className="card-edge card-edge-left" />
        <div className="card-edge card-edge-right" />
        <div className="card-back" style={{ '--card-color': card.color }} />
        <div className="card-face-front" style={{ '--card-color': card.color }}>
          <div
            className="scatter-card-image card-inner"
            style={{
              background: hasBg
                ? `url(${card.bgImage}) center/cover no-repeat, #141416`
                : `linear-gradient(160deg, rgba(${r(card.color)}, ${g(card.color)}, ${b(card.color)}, 0.4) 0%, rgba(${r(card.color)}, ${g(card.color)}, ${b(card.color)}, 0.12) 45%, #141416 100%)`,
            }}
          />
          <div className="scatter-card-text">
            <div className="card-label-scatter" style={{ color: card.color }}>◆ {card.title} ◆</div>
            <h2 className="card-title-scatter">{card.subtitle}</h2>
            <p className="card-description-scatter">{card.description}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`about-overlay-wrapper ${isAnimatingOut ? 'no-pointer' : ''}`}>
      <div ref={overlayRef} className="about-overlay-bg-black" />
      <div ref={bgRef} className="about-overlay-bg-halftone">
        <video
          ref={halftoneVideoRef}
          className="halftone-source-video"
          src="/bg.mp4"
          autoPlay
          loop
          muted
          playsInline
        />
        <canvas ref={halftoneCanvasRef} className="halftone-canvas" />
      </div>
      <button onClick={onClose} className="about-close-button">
        <X className="about-close-icon" />
      </button>
      <div
        ref={containerRef}
        className="about-container hide-scrollbar"
        onMouseDown={stopBubble}
        onMouseUp={stopBubble}
        onMouseMove={stopBubble}
        onTouchStart={stopBubble}
        onTouchMove={stopBubble}
        onTouchEnd={stopBubble}
      >
        <div className="scatter-stage hang-stage" ref={stageRef}>
          <canvas className="hang-chain-canvas" ref={chainCanvasRef} />
          {cards.map(renderCard)}
          {selectedCardIndex !== null && (
            <div
              className="about-detail-panel"
              style={{ '--detail-color': cards[selectedCardIndex].color }}
            >
              <button type="button" className="about-detail-back" onClick={restoreCards}>
                <ArrowLeft aria-hidden="true" />
                <span>Back</span>
              </button>
              <div className="about-detail-label">{cards[selectedCardIndex].title}</div>
              <h2 className="about-detail-title">{cards[selectedCardIndex].subtitle}</h2>
              <p className="about-detail-copy">{cards[selectedCardIndex].fullContent}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}