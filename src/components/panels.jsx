import React, { useState, useEffect, useRef, useCallback } from 'react';
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
];

const SCRAMBLE_CHARS = '!<>-_\\/[]{}—=+*^?#________敵呪術滅相殺領域展開';

function useScrambleType(text, { startDelay = 0, speed = 35, runKey = 0 } = {}) {
  const [output, setOutput] = useState('');
  const rafRef = useRef(null);
  const timeoutRef = useRef(null);
  useEffect(() => {
    setOutput('');
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (!text) return;
    let cancelled = false;
    let startTime = 0;
    let frame = 0;
    let lastRevealed = -1;
    let lastOutput = '';
    const tick = (now) => {
      if (cancelled) return;
      if (!startTime) startTime = now;
      const revealed = Math.min(text.length, Math.floor((now - startTime) / speed));
      frame++;
      if (revealed >= text.length) {
        if (lastOutput !== text) setOutput(text);
        return;
      }
      const scrambleChanged = frame % 2 === 0;
      if (revealed !== lastRevealed || scrambleChanged) {
        let out = text.substring(0, revealed);
        const scrambleAhead = Math.min(3, text.length - revealed);
        for (let i = 0; i < scrambleAhead; i++) {
          const targetChar = text[revealed + i];
          if (targetChar === ' ' || targetChar === '\n') {
            out += targetChar;
          } else {
            out += SCRAMBLE_CHARS[(frame + i * 7) % SCRAMBLE_CHARS.length];
          }
        }
        if (out !== lastOutput) {
          lastOutput = out;
          setOutput(out);
        }
        lastRevealed = revealed;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    timeoutRef.current = setTimeout(() => {
      startTime = 0;
      rafRef.current = requestAnimationFrame(tick);
    }, startDelay);
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [text, startDelay, speed, runKey]);

  return output;
}

export default function ActivePanelOverlay({ currentFace, visible, onAboutOpen }) {
  const [htmlVisible, setHtmlVisible] = useState(false);
  const [displayFace, setDisplayFace] = useState(currentFace);
  const [transitionPhase, setTransitionPhase] = useState('idle');
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef(null);
  const exitAnimRef = useRef(null);
  const enterAnimRef = useRef(null);
  const displayFaceRef = useRef(currentFace);
  useEffect(() => {
    displayFaceRef.current = displayFace;
  }, [displayFace]);
  useEffect(() => {
    if (visible) {
      const t = setTimeout(() => setHtmlVisible(true), 100);
      return () => clearTimeout(t);
    } else {
      setHtmlVisible(false);
    }
  }, [visible]);
  useEffect(() => {
    if (currentFace === displayFaceRef.current) return;
    const card = cardRef.current;
    if (!card) {
      setDisplayFace(currentFace);
      return;
    }
    if (exitAnimRef.current) exitAnimRef.current.pause();
    if (enterAnimRef.current) enterAnimRef.current.pause();
    let cancelled = false;
    setTransitionPhase('exiting');
    exitAnimRef.current = anime({
      targets: card,
      translateX: [0, -60],
      translateY: [0, 0],
      opacity: [1, 0],
      filter: ['blur(0px)', 'blur(8px)'],
      scale: [1, 0.92],
      duration: 280,
      easing: 'easeInQuad',
      complete: () => {
        if (cancelled) return;
        setDisplayFace(currentFace);
        displayFaceRef.current = currentFace;
        anime.set(card, {
          translateX: 60,
          opacity: 0,
          filter: 'blur(8px)',
          scale: 0.92,
        });
        setTransitionPhase('entering');
        enterAnimRef.current = anime({
          targets: card,
          translateX: [60, 0],
          opacity: [0, 1],
          filter: ['blur(8px)', 'blur(0px)'],
          scale: [0.92, 1],
          duration: 520,
          easing: 'easeOutExpo',
          complete: () => {
            if (cancelled) return;
            setTransitionPhase('idle');
            anime.set(card, {
              translateX: 0,
              opacity: 1,
              filter: 'blur(0px)',
              scale: 1,
            });
          }
        });
      }
    });
    return () => {
      cancelled = true;
      if (exitAnimRef.current) exitAnimRef.current.pause();
      if (enterAnimRef.current) enterAnimRef.current.pause();
    };
  }, [currentFace]);

  useEffect(() => {
    if (!htmlVisible || !cardRef.current) return;
    if (transitionPhase !== 'idle') return;
    anime.set(cardRef.current, { translateX: 0, opacity: 1, filter: 'blur(0px)', scale: 1 });
  }, [htmlVisible, transitionPhase]);

  const currentPanel = PANELS[displayFace] || PANELS[0];
  const isClickable = displayFace === 0;
  const isInteractive = Boolean(currentPanel.title);
  const typingActive = transitionPhase !== 'exiting';
  const titleText = typingActive ? currentPanel.title : '';
  const descText = typingActive ? currentPanel.description : '';
  const runKey = displayFace * 10 + (typingActive ? 1 : 0);
  const typedTitle = useScrambleType(titleText, {
    startDelay: 120,
    speed: 55,
    runKey,
  });
  const titleDuration = (currentPanel.title?.length || 0) * 55 + 120;
  const typedDesc = useScrambleType(descText, {
    startDelay: titleDuration + 80,
    speed: 22,
    runKey,
  });
  const titleDone = typedTitle === currentPanel.title && currentPanel.title.length > 0;
  const descDone = typedDesc === currentPanel.description && currentPanel.description.length > 0;
  if (!visible && !htmlVisible) return null;

  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: isHovered ? 9999 : 10,
      pointerEvents: isInteractive ? 'auto' : 'none',
      opacity: htmlVisible ? 1 : 0,
      transition: 'opacity 0.8s ease',
    }}>
      <div
        ref={cardRef}
        onClick={isClickable && currentPanel.title ? onAboutOpen : undefined}
        onMouseEnter={isInteractive ? () => setIsHovered(true) : undefined}
        onMouseLeave={isInteractive ? () => setIsHovered(false) : undefined}
        style={{
          width: '420px',
          padding: '20px 28px',
          color: '#f5e6e6',
          fontFamily: "'Segoe UI', sans-serif",
          textAlign: 'center',
          pointerEvents: isInteractive ? 'auto' : 'none',
          cursor: (isClickable && currentPanel.title) ? 'pointer' : 'default',
          borderRadius: 4,
          background: isInteractive ? (isHovered ? 'rgba(204,17,17,0.2)' : 'rgba(10,0,5,0.6)') : 'transparent',
          border: isInteractive ? '1px solid rgba(204,17,17,0.5)' : 'none',
          backdropFilter: 'blur(4px)',
          transition: 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94), background 0.2s ease, border-color 0.3s ease',
          transform: isHovered ? 'scale(1.4)' : 'scale(1)',
          willChange: 'transform, opacity, filter',
        }}
      >
        {currentPanel.title && (
          <>
            <div style={{
              fontSize: '10px',
              letterSpacing: '4px',
              textTransform: 'uppercase',
              color: '#cc2222',
              marginBottom: '8px',
              fontWeight: 700,
              opacity: titleDone ? 1 : 0.6,
              transition: 'opacity 0.4s ease',
            }}>
              ◆ DOMAIN EXPANSION ◆
            </div>

            <div style={{
              fontSize: '22px',
              fontWeight: 800,
              color: '#ffffff',
              minHeight: '33px',
              marginBottom: '12px',
              textShadow: titleDone
                ? '0 0 18px #cc1111, 0 0 40px #880000'
                : '0 0 8px #cc1111, 0 0 22px #ff3322',
              letterSpacing: '1px',
              fontFamily: "'Segoe UI', sans-serif",
              transition: 'text-shadow 0.5s ease',
            }}>
              {typedTitle}
              {!titleDone && (
                <span style={{
                  display: 'inline-block',
                  width: '2px',
                  height: '22px',
                  background: '#cc1111',
                  marginLeft: '3px',
                  verticalAlign: 'middle',
                  animation: 'panel-cursor-blink 0.6s steps(2) infinite',
                  boxShadow: '0 0 8px #cc1111',
                }} />
              )}
            </div>

            <div style={{
              width: titleDone ? '120px' : '24px',
              height: '2px',
              background: 'linear-gradient(90deg, transparent, #cc1111, transparent)',
              margin: '0 auto 14px',
              transition: 'width 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            }} />

            <div style={{
              fontSize: '12px',
              lineHeight: '1.75',
              color: '#c9a8a8',
              fontWeight: 400,
              whiteSpace: 'pre-line',
              minHeight: '42px',
            }}>
              {typedDesc}
              {titleDone && !descDone && typedDesc.length > 0 && (
                <span style={{
                  display: 'inline-block',
                  width: '6px',
                  height: '12px',
                  background: '#cc1111',
                  marginLeft: '2px',
                  verticalAlign: 'middle',
                  animation: 'panel-cursor-blink 0.6s steps(2) infinite',
                  opacity: 0.7,
                }} />
              )}
            </div>
          </>
        )}

        {isClickable && currentPanel.title && (
          <div style={{
            marginTop: 16,
            fontSize: '10px',
            letterSpacing: '3px',
            color: '#cc2222',
            textTransform: 'uppercase',
            fontWeight: 700,
            opacity: descDone ? 1 : 0,
            transform: descDone ? 'translateY(0)' : 'translateY(6px)',
            transition: 'opacity 0.5s ease, transform 0.5s ease',
          }}>
            [ ENTER ]
          </div>
        )}
      </div>

      <style>{`
        @keyframes panel-cursor-blink {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
