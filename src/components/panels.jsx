import React, { useState, useEffect, useRef } from 'react';
import anime from 'animejs';

const PANELS = [
  {
    title: "About Me",
    description: "A developer obsessed with crafting immersive\nweb experiences...",
  },
  {
    title: "Dismantle & Cleave",
    description: "Two innate techniques of the King of Curses...",
  },
  {
    title: "", 
    description: "",
  },
  {
    title: "King of Curses",
    description: "Ryomen Sukuna — the undisputed sovereign...",
  }
]

export default function ActivePanelOverlay({ currentFace, visible, onAboutOpen }) {
  const [htmlVisible, setHtmlVisible] = useState(false);
  const [displayFace, setDisplayFace] = useState(currentFace);
  const innerDivRef = useRef();
  useEffect(() => {
    if (visible) {
      setTimeout(() => setHtmlVisible(true), 100); 
    } else {
      setHtmlVisible(false);
    }
  }, [visible]);
  useEffect(() => {
    if (currentFace === displayFace || !innerDivRef.current) return;
    const diff = currentFace - displayFace;
    const direction = (diff === 1 || diff === -3) ? 1 : -1;
    anime({
      targets: innerDivRef.current,
      translateX: direction * 150,
      opacity: 0,
      duration: 350,
      easing: 'easeInQuad',
      complete: () => {
        setDisplayFace(currentFace);
        anime({
          targets: innerDivRef.current,
          translateX: [-direction * 150, 0],
          opacity: [0, 1],
          duration: 450,
          easing: 'easeOutQuad'
        });
      }
    });
  }, [currentFace, displayFace]);

  if (!visible && !htmlVisible) return null;
  const currentPanel = PANELS[displayFace]; 
  const isClickable = displayFace === 0;
  
  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 10,
      pointerEvents: 'none',
      opacity: htmlVisible ? 1 : 0, 
      transition: 'opacity 0.8s ease'
    }}>
      <div
          ref={innerDivRef}
          onClick={isClickable && currentPanel.title ? onAboutOpen : undefined}
          style={{
            width: '420px',
            padding: '20px 28px',
            color: '#f5e6e6',
            fontFamily: "'Segoe UI', sans-serif",
            textAlign: 'center',
            pointerEvents: (isClickable && currentPanel.title) ? 'auto' : 'none',
            cursor: (isClickable && currentPanel.title) ? 'pointer' : 'default',
            borderRadius: 4,
            background: currentPanel.title ? 'rgba(10,0,5,0.6)' : 'transparent',
            border: currentPanel.title ? '1px solid rgba(204,17,17,0.5)' : 'none',
            backdropFilter: 'blur(4px)',
            transition: 'background 0.2s ease',
          }}
          onMouseEnter={isClickable && currentPanel.title ? e => { e.currentTarget.style.background = 'rgba(204,17,17,0.2)'; } : undefined}
          onMouseLeave={isClickable && currentPanel.title ? e => { e.currentTarget.style.background = 'rgba(10,0,5,0.6)'; } : undefined}
        >
          {currentPanel.title && (
            <>
              <div style={{ fontSize: '10px', letterSpacing: '4px', textTransform: 'uppercase', color: '#cc2222', marginBottom: '8px', fontWeight: 700 }}>
                ◆ DOMAIN EXPANSION ◆
              </div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', marginBottom: '12px', textShadow: '0 0 18px #cc1111, 0 0 40px #880000', letterSpacing: '1px' }}>
                {currentPanel.title}
              </div>
              <div style={{ width: '50px', height: '2px', background: 'linear-gradient(90deg, transparent, #cc1111, transparent)', margin: '0 auto 14px' }} />
              <div style={{ fontSize: '12px', lineHeight: '1.75', color: '#c9a8a8', fontWeight: 400, whiteSpace: 'pre-line' }}>
                {currentPanel.description}
              </div>
            </>
          )}
          {isClickable && currentPanel.title && (
            <div style={{ marginTop: 16, fontSize: '10px', letterSpacing: '3px', color: '#cc2222', textTransform: 'uppercase', fontWeight: 700 }}>
              [ ENTER ]
            </div>
          )}
        </div>
    </div>
  );
}