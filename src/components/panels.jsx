import React, { useState, useEffect, useRef } from 'react';

const PANELS = [
  { title: "About Me" },
  { title: "Contact Me" },
  { title: "" },
  { title: "My Projects" },
];

function HandwrittenTitle({ text, animationKey, isErasing, onEraseComplete }) {
  const letters = Array.from(text);
  const letterStep = 90;
  const ruleDelay = 500 + letters.length * letterStep;

  const handleAnimationEnd = (event) => {
    if (event.target === event.currentTarget && event.animationName === 'poster-title-erase') {
      onEraseComplete();
    }
  };

  return (
    <div
      key={animationKey}
      className={`poster-title-lockup${isErasing ? ' is-erasing' : ''}${text ? '' : ' is-empty'}`}
      style={{ '--poster-rule-delay': `${ruleDelay}ms` }}
      onAnimationEnd={handleAnimationEnd}
    >
      {text && (
        <>
          <svg
            className="poster-title"
            viewBox="0 0 520 112"
            role="img"
            aria-label={text}
            preserveAspectRatio="xMidYMid meet"
          >
            <text
              className="poster-title-text"
              x="50%"
              y="80"
              textAnchor="middle"
              xmlSpace="preserve"
              aria-hidden="true"
            >
              {letters.map((letter, index) => (
                <tspan
                  key={`${animationKey}-${index}`}
                  className={`poster-letter${letter === ' ' ? ' poster-letter--space' : ''}`}
                  style={{ animationDelay: `${140 + index * letterStep}ms` }}
                >
                  {letter === ' ' ? '\u00a0' : letter}
                </tspan>
              ))}
            </text>
          </svg>
          <svg className="poster-rule" viewBox="0 0 400 24" aria-hidden="true">
            <path
              className="poster-rule-path"
              pathLength="1"
              d="M8 13 C70 4 126 18 188 10 S306 15 392 7"
            />
          </svg>
        </>
      )}
    </div>
  );
}

export default function ActivePanelOverlay({ currentFace, visible, onAboutOpen, onContactOpen, onProjectsOpen }) {
  const [htmlVisible, setHtmlVisible] = useState(false);
  const [displayFace, setDisplayFace] = useState(currentFace);
  const [transitionPhase, setTransitionPhase] = useState('idle');
  const [isHovered, setIsHovered] = useState(false);
  const displayFaceRef = useRef(currentFace);
  const targetFaceRef = useRef(currentFace);
  const currentPanel = PANELS[displayFace] || PANELS[0];
  const clickHandler = displayFace === 0
    ? onAboutOpen
    : displayFace === 1
      ? onContactOpen
      : displayFace === 3
        ? onProjectsOpen
        : undefined;
  const isErasing = transitionPhase === 'erasing';
  const isInteractive = Boolean(clickHandler) && !isErasing;

  useEffect(() => {
    displayFaceRef.current = displayFace;
  }, [displayFace]);

  useEffect(() => {
    const timeout = setTimeout(() => setHtmlVisible(visible), visible ? 100 : 0);
    return () => clearTimeout(timeout);
  }, [visible]);

  useEffect(() => {
    if (currentFace === displayFaceRef.current) return;
    targetFaceRef.current = currentFace;
    const frame = requestAnimationFrame(() => {
      if (!visible && !htmlVisible) {
        setDisplayFace(currentFace);
        displayFaceRef.current = currentFace;
        return;
      }
      setIsHovered(false);
      setTransitionPhase('erasing');
    });
    return () => cancelAnimationFrame(frame);
  }, [currentFace, htmlVisible, visible]);

  const handleEraseComplete = () => {
    const nextFace = targetFaceRef.current;
    setDisplayFace(nextFace);
    displayFaceRef.current = nextFace;
    setTransitionPhase('idle');
  };

  if (!visible && !htmlVisible) return null;

  return (
    <div
      className={`panel-wrapper${isInteractive ? ' is-interactive' : ''}${htmlVisible ? ' is-visible' : ''}${isHovered ? ' is-hovered' : ''}`}
    >
      <svg className="poster-defs" width="0" height="0" aria-hidden="true" focusable="false">
        <defs>
          <filter id="poster-paper-fx" x="-12%" y="-14%" width="124%" height="130%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.028" numOctaves="8" seed="14" result="paperNoise" />
            <feDiffuseLighting in="paperNoise" lightingColor="#fffaf0" surfaceScale="2.8" diffuseConstant="1.05" result="paperLight">
              <feDistantLight azimuth="45" elevation="60" />
            </feDiffuseLighting>
            <feTurbulence type="turbulence" baseFrequency="0.048" numOctaves="8" seed="14" result="edgeNoise" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.5" result="softSource" />
            <feMorphology in="softSource" operator="erode" radius="3.2" result="erodedSource" />
            <feOffset in="erodedSource" dx="-1.5" dy="-1.5" result="offsetSource" />
            <feDisplacementMap in="offsetSource" in2="edgeNoise" scale="14" xChannelSelector="B" yChannelSelector="G" result="tornEdge" />
            <feComposite in="paperLight" in2="tornEdge" operator="atop" result="roughPaper" />
            <feComposite in="SourceGraphic" in2="tornEdge" operator="atop" result="paperColor" />
            <feBlend in="roughPaper" in2="paperColor" mode="multiply" />
          </filter>
          <filter id="poster-crumb-fx" x="-40%" y="-40%" width="180%" height="180%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.05 0.08" numOctaves="3" seed="21" result="e" />
            <feDisplacementMap in="SourceGraphic" in2="e" scale="7" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="poster-ink-fx" x="-5%" y="-12%" width="110%" height="124%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.018 0.09" numOctaves="2" seed="31" result="inkNoise" />
            <feDisplacementMap in="SourceGraphic" in2="inkNoise" scale="1.25" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>
      <div className="panel-card">
        <div
          onClick={isInteractive ? clickHandler : undefined}
          onMouseEnter={isInteractive ? () => setIsHovered(true) : undefined}
          onMouseLeave={isInteractive ? () => setIsHovered(false) : undefined}
          className={`poster-inner${isInteractive ? ' poster-inner--interactive' : ''}${isHovered ? ' is-hovered' : ''}`}
        >
          <div className="poster-paper" />
          <div className="poster-crumbs" />
          <span className="poster-tape poster-tape--tl" />
          <span className="poster-tape poster-tape--br" />
          <div className="poster-content">
            <HandwrittenTitle
              text={currentPanel.title}
              animationKey={`${displayFace}-${htmlVisible ? 'visible' : 'hidden'}`}
              isErasing={isErasing}
              onEraseComplete={handleEraseComplete}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
