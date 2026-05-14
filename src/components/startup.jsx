import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export default function StartupAnimation({ onComplete }) {
  const containerRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !wrapperRef.current) return;
    const lines = containerRef.current.querySelectorAll('.hash-line');
    const tl = gsap.timeline({
      onComplete: () => {
        gsap.to(wrapperRef.current, {
          opacity: 0,
          duration: 1,
          onComplete: onComplete
        });
      }
    });
    tl.fromTo(lines,
      { strokeDasharray: 100, strokeDashoffset: 100 },
      { strokeDashoffset: 0, duration: 1, stagger: 0.2, ease: "expo.inOut" }
    )
    .to(lines, {
      opacity: 0,
      duration: 0.5,
      delay: 1, 
      ease: "power2.in"
    });
  }, [onComplete]);

  return (
    <div
      ref={wrapperRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#160000',
        pointerEvents: 'none'
      }}
    >
      <style>{`
        .hash-line {
          transform-origin: center;
          transition: stroke 0.3s ease;
        }
        svg:hover .hash-line {
          stroke: #ffffff;
          filter: drop-shadow(0 0 8px #F40C3F);
        }
      `}</style>
      <svg
        ref={containerRef}
        width="200"
        height="200"
        viewBox="0 0 100 100"
        fill="none"
        stroke="#F40C3F"
        strokeWidth="6"
        strokeLinecap="round"
        style={{ pointerEvents: 'auto' }}
      >
        <line className="hash-line" x1="20" y1="35" x2="80" y2="35" />
        <line className="hash-line" x1="20" y1="65" x2="80" y2="65" />
        <line className="hash-line" x1="35" y1="20" x2="35" y2="80" />
        <line className="hash-line" x1="65" y1="20" x2="65" y2="80" />
      </svg>
    </div>
  );
}
