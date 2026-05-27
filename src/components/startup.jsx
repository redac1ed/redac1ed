import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export default function StartupAnimation({ onComplete }) {
  const containerRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !wrapperRef.current) return;
    const lines = containerRef.current.querySelectorAll('.hash-line');
    lines.forEach(line => {
      line.style.willChange = 'stroke-dashoffset';
    });
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
      { strokeDashoffset: 0, duration: 1, stagger: 0.15, ease: "power2.inOut" }
    )
    .to(lines, {
      strokeDashoffset: -100,
      duration: 0.8,
      ease: "power2.in"
    }, "+=0.3");
    return () => {
      tl.kill();
      lines.forEach(line => {
        line.style.willChange = 'auto';
      });
    };
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
        background: '#000000',
        pointerEvents: 'none'
      }}
    >
      <svg
        ref={containerRef}
        className="startup-svg"
        width="280"
        height="280"
        viewBox="0 0 100 100"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="11"
        strokeLinecap="round"
        style={{
          pointerEvents: 'none',
          overflow: 'visible'
        }}
      >
        <line className="hash-line" x1="15" y1="35" x2="85" y2="35" pathLength="100" />
        <line className="hash-line" x1="15" y1="65" x2="85" y2="65" pathLength="100" />
        <line className="hash-line" x1="30" y1="85" x2="45" y2="15" pathLength="100" />
        <line className="hash-line" x1="60" y1="85" x2="75" y2="15" pathLength="100" />
      </svg>
    </div>
  );
}
