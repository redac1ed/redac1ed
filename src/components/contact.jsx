import { useEffect, useRef } from 'react';
import anime from 'animejs';
import { X } from 'lucide-react';

export default function ContactOverlay({ onClose, isAnimatingIn, isAnimatingOut, onOutComplete }) {
  const overlayRef = useRef();
  const bgRef = useRef();
  const containerRef = useRef();
  const animRef = useRef(null);
  const bgAnimRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !overlayRef.current || !bgRef.current) return;
    if (animRef.current) animRef.current.pause();
    if (bgAnimRef.current) bgAnimRef.current.pause();
    if (isAnimatingIn) {
      animRef.current = anime({ targets: containerRef.current, scale: [0.8, 1], opacity: [0, 1], duration: 500, easing: 'easeInOutCubic' });
      bgAnimRef.current = anime({ targets: [overlayRef.current, bgRef.current], opacity: [0, 1], duration: 500, easing: 'easeInOutCubic' });
    } else if (isAnimatingOut) {
      animRef.current = anime({ targets: containerRef.current, scale: [1, 0.8], opacity: [1, 0], duration: 500, easing: 'easeInOutCubic', complete: () => onOutComplete?.() });
      bgAnimRef.current = anime({ targets: [overlayRef.current, bgRef.current], opacity: [1, 0], duration: 500, easing: 'easeInOutCubic' });
    }
    return () => {
      if (animRef.current) animRef.current.pause();
      if (bgAnimRef.current) bgAnimRef.current.pause();
    };
  }, [isAnimatingIn, isAnimatingOut, onOutComplete]);

  const stopBubble = (e) => e.stopPropagation();

  return (
    <div className={`about-overlay-wrapper ${isAnimatingOut ? 'no-pointer' : ''}`}>
      <div ref={overlayRef} className="about-overlay-bg-black" />
      <div ref={bgRef} className="about-overlay-bg-pattern" />
      <button onClick={onClose} className="about-close-button">
        <X style={{ width: 22, height: 22, color: '#f87171' }} />
      </button>
      <div ref={containerRef} className="about-container hide-scrollbar"
        onMouseDown={stopBubble} onMouseUp={stopBubble} onMouseMove={stopBubble}
        onTouchStart={stopBubble} onTouchMove={stopBubble} onTouchEnd={stopBubble}>
        {/* your contact content: email, socials, form, etc. */}
      </div>
    </div>
  );
}