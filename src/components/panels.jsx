import React, { useState, useEffect, useRef } from 'react';
import anime from 'animejs';

const PANELS = [
  {
    title: "About Me",
    description: "Heya! I am redac1ed!!",
  },
  {
    title: "Contact Me",
    description: "Wanna collab? Just hit me up!!!",
  },
  {
    title: "",
    description: "",
  },
  {
    title: "My Projects",
    description: "Some random projects I made for fun!!",
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

export default function ActivePanelOverlay({ currentFace, visible, onAboutOpen, onContactOpen }) {
  const [htmlVisible, setHtmlVisible] = useState(false);
  const [displayFace, setDisplayFace] = useState(currentFace);
  const [transitionPhase, setTransitionPhase] = useState('idle');
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef(null);
  const exitAnimRef = useRef(null);
  const enterAnimRef = useRef(null);
  const displayFaceRef = useRef(currentFace);
  const currentPanel = PANELS[displayFace] || PANELS[0];
  const clickHandler = displayFace === 0 ? onAboutOpen : displayFace === 1 ? onContactOpen : undefined;
  const isInteractive = Boolean(currentPanel.title);
  const typingActive = transitionPhase !== 'exiting';
  const titleText = typingActive ? currentPanel.title : '';
  const descText = typingActive ? currentPanel.description : '';
  const runKey = displayFace * 10 + (typingActive ? 1 : 0);
  const titleDuration = (currentPanel.title?.length || 0) * 55 + 120;
  const typedTitle = useScrambleType(titleText, {
    startDelay: 120,
    speed: 55,
    runKey,
  });
  const typedDesc = useScrambleType(descText, {
    startDelay: titleDuration + 80,
    speed: 22,
    runKey,
  });
  const titleDone = typedTitle === currentPanel.title && currentPanel.title.length > 0;
  const descDone = typedDesc === currentPanel.description && currentPanel.description.length > 0;
  if (!visible && !htmlVisible) return null;

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
      const dir = currentFace > displayFaceRef.current ? 1 : -1;
      setTransitionPhase('exiting');
      exitAnimRef.current = anime({
        targets: card,
        translateX: [0, dir * -60],
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
            translateX: dir * 60,
            opacity: 0,
            filter: 'blur(8px)',
            scale: 0.92,
          });
          setTransitionPhase('entering');
          enterAnimRef.current = anime({
            targets: card,
            translateX: [dir * 60, 0],
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

  return (
    <div
      className={`panel-wrapper${isInteractive ? ' is-interactive' : ''}${htmlVisible ? ' is-visible' : ''}${isHovered ? ' is-hovered' : ''}`}
    >
      <div
        ref={cardRef}
        onClick={clickHandler}
        onMouseEnter={isInteractive ? () => setIsHovered(true) : undefined}
        onMouseLeave={isInteractive ? () => setIsHovered(false) : undefined}
        className={`panel-card${isInteractive ? ' panel-card--interactive' : ''}${isHovered ? ' is-hovered' : ''}`}
      >
        {currentPanel.title && (
          <>
            <div className={`panel-subtitle${titleDone ? ' is-done' : ''}`}>
              ◆ redac1ed ◆
            </div>
            <div className={`panel-title${titleDone ? ' is-done' : ''}`}>
              {typedTitle}
              {!titleDone && <span className="panel-cursor panel-cursor--title" />}
            </div>
            <div className={`panel-divider${titleDone ? ' is-done' : ''}`} />
            <div className="panel-description">
              {typedDesc}
              {titleDone && !descDone && typedDesc.length > 0 && (
                <span className="panel-cursor panel-cursor--desc" />
              )}
            </div>
          </>
        )}
        {isInteractive && currentPanel.title && (
          <div className={`panel-enter-text${descDone ? ' is-done' : ''}`}>
            [ ENTER ]
          </div>
        )}
      </div>
    </div>
  );
}
