import { useEffect, useRef } from 'react';
import anime from 'animejs';
import { X } from 'lucide-react';

export default function AboutMeOverlay({ onClose, isAnimatingIn, isAnimatingOut, onOutComplete }) {
  const overlayRef = useRef();
  const bgRef = useRef();
  const contentRef = useRef();
  const animRef = useRef(null);
  const bgAnimRef = useRef(null);

  useEffect(() => {
    if (!contentRef.current || !overlayRef.current || !bgRef.current) return;
    if (animRef.current) animRef.current.pause();
    if (bgAnimRef.current) bgAnimRef.current.pause();

    if (isAnimatingIn) {
      animRef.current = anime({
        targets: contentRef.current,
        scale: [0.05, 1],
        opacity: [0, 1],
        duration: 400,
        easing: 'easeInOutCubic',
      });
      bgAnimRef.current = anime({
        targets: [overlayRef.current, bgRef.current],
        opacity: [0, 1],
        duration: 400,
        easing: 'easeInOutCubic',
      });
    } else if (isAnimatingOut) {
      animRef.current = anime({
        targets: contentRef.current,
        scale: [1, 0.05],
        opacity: [1, 0],
        duration: 400,
        easing: 'easeInOutCubic',
        complete: () => {
          if (onOutComplete) onOutComplete();
        },
      });
      bgAnimRef.current = anime({
        targets: [overlayRef.current, bgRef.current],
        opacity: [1, 0],
        duration: 400,
        easing: 'easeInOutCubic',
      });
    }
    return () => { 
      if (animRef.current) animRef.current.pause(); 
      if (bgAnimRef.current) bgAnimRef.current.pause();
    };
  }, [isAnimatingIn, isAnimatingOut, onOutComplete]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: isAnimatingOut ? 'none' : 'auto',
      }}
    >
      <div 
        ref={overlayRef}
        style={{
           position: 'absolute',
           inset: 0,
           background: '#000000',
           opacity: 0,
        }}
      />
      <div 
        ref={bgRef}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle, #2a2a2a 1px, transparent 1px)',
          backgroundSize: '20px 24px',
          opacity: 0,
          animation: 'moveBg 4s linear infinite',
        }} 
      />
      <style>{`
        @keyframes moveBg {
          0% { background-position: 0 0; }
          100% { background-position: -20px -24px; }
        }
      `}</style>
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 24,
          right: 24,
          background: 'rgba(10,10,10,0.85)',
          border: '2px solid #ef4444',
          borderRadius: '50%',
          width: 48,
          height: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 101,
        }}
      >
        <X style={{ width: 22, height: 22, color: '#f87171' }} />
      </button>
      <div
        ref={contentRef}
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 700,
          width: '90%',
          color: '#f5e6e6',
          fontFamily: "'Segoe UI', sans-serif",
          textAlign: 'center',
          padding: '48px 40px',
          border: '1px solid rgba(204,17,17,0.3)',
          borderRadius: 4,
          background: 'rgba(10,0,5,0.6)',
          backdropFilter: 'blur(4px)',
          transform: isAnimatingIn ? 'scale(0.05)' : 'scale(1)',
        }}
      >
        <div style={{ fontSize: '10px', letterSpacing: '4px', textTransform: 'uppercase', color: '#cc2222', marginBottom: 12, fontWeight: 700 }}>
          ◆ ABOUT ME ◆
        </div>
        <h1 style={{ fontSize: 36, fontWeight: 800, color: '#ffffff', marginBottom: 16, textShadow: '0 0 18px #cc1111, 0 0 40px #880000', letterSpacing: 1 }}>
          Vaibhav
        </h1>
        <div style={{ width: 60, height: 2, background: 'linear-gradient(90deg, transparent, #cc1111, transparent)', margin: '0 auto 24px' }} />
        <p style={{ fontSize: 15, lineHeight: 1.85, color: '#c9a8a8', marginBottom: 20 }}>
          A developer obsessed with crafting immersive web experiences — blending 3D graphics, animation, and clean code into something that feels alive.
        </p>
        <p style={{ fontSize: 14, lineHeight: 1.85, color: '#9a7878' }}>
          Passionate about React, Three.js, and pushing the limits of what a browser can render.
        </p>
      </div>
    </div>
  );
}