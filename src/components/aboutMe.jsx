import { useEffect, useRef, useState } from 'react';
import anime from 'animejs';
import { X } from 'lucide-react';
import VideoCarousel from './anime';

export default function AboutMeOverlay({ onClose, isAnimatingIn, isAnimatingOut, onOutComplete }) {
  const overlayRef = useRef();
  const bgRef = useRef();
  const containerRef = useRef();
  const animRef = useRef(null);
  const bgAnimRef = useRef(null);
  const [expandedCard, setExpandedCard] = useState(null);
  const [originRect, setOriginRect] = useState(null);
  const expandAnimRef = useRef(null);
  const expandBackdropRef = useRef(null);
  const expandModalRef = useRef(null);
  const cards = [
    {
      id: 'about',
      title: 'About Me',
      subtitle: 'redac1ed',
      description: 'Hear out my story and how I became a teenage web developer!',
      fullContent: 'Passionate about React, Three.js, and pushing the limits of what a browser can render.',
      color: '#cc1111',
      bgImage: '/sukuna.png',
      slot: 'topLeft',
    },
    {
      id: 'anime',
      title: 'Anime',
      subtitle: 'Animes',
      description: 'My top anime picks that I love!',
      fullContent: 'My top anime picks that I love!',
      color: '#006793',
      slot: 'midLeft',
    },
    {
      id: 'likes',
      title: 'Things I Like',
      subtitle: 'Things I Like',
      description: 'Things that inspire me',
      fullContent: 'My interests and passions',
      color: '#cc1111',
      slot: 'topRight',
    },
    {
      id: 'games',
      title: 'Games',
      subtitle: 'Games I Love',
      description: 'The games I (sometimes) play!',
      fullContent: 'My favorite games and projects',
      color: '#1a7a5c',
      bgImage: '/mc.png',
      slot: 'bottomLeft',
    },
    {
      id: 'other',
      title: 'Other',
      subtitle: 'Other stuff',
      description: 'More about me',
      fullContent: 'Additional interests and hobbies',
      color: '#7a3a1a',
      slot: 'bottomRight',
    }
  ];

  useEffect(() => {
    if (!containerRef.current || !overlayRef.current || !bgRef.current) return;
    if (animRef.current) animRef.current.pause();
    if (bgAnimRef.current) bgAnimRef.current.pause();
    if (isAnimatingIn) {
      animRef.current = anime({
        targets: containerRef.current,
        scale: [0.8, 1],
        opacity: [0, 1],
        duration: 500,
        easing: 'easeInOutCubic',
      });
      bgAnimRef.current = anime({
        targets: [overlayRef.current, bgRef.current],
        opacity: [0, 1],
        duration: 500,
        easing: 'easeInOutCubic',
      });
    } else if (isAnimatingOut) {
      animRef.current = anime({
        targets: containerRef.current,
        scale: [1, 0.8],
        opacity: [1, 0],
        duration: 500,
        easing: 'easeInOutCubic',
        complete: () => {
          if (onOutComplete) onOutComplete();
        },
      });
      bgAnimRef.current = anime({
        targets: [overlayRef.current, bgRef.current],
        opacity: [1, 0],
        duration: 500,
        easing: 'easeInOutCubic',
      });
    }
    return () => {
      if (animRef.current) animRef.current.pause();
      if (bgAnimRef.current) bgAnimRef.current.pause();
    };
  }, [isAnimatingIn, isAnimatingOut, onOutComplete]);

  const handleCardClick = (cardId, e) => {
    const cardEl = e.currentTarget;
    const rect = cardEl.getBoundingClientRect();
    setOriginRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      cardEl,
    });
    cardEl.style.visibility = 'hidden';
    setExpandedCard(cardId);
  };

  useEffect(() => {
    if (!expandedCard || !originRect) return;
    const modal = expandModalRef.current;
    const backdrop = expandBackdropRef.current;
    if (!modal || !backdrop) return;
    if (expandAnimRef.current) expandAnimRef.current.pause();

    const finalRect = modal.getBoundingClientRect();
    const finalLeft = finalRect.left;
    const finalTop = finalRect.top;
    const finalWidth = finalRect.width;
    const finalHeight = finalRect.height;

    Object.assign(modal.style, {
      position: 'fixed',
      margin: '0',
      left: `${originRect.left}px`,
      top: `${originRect.top}px`,
      width: `${originRect.width}px`,
      height: `${originRect.height}px`,
      maxWidth: 'none',
      maxHeight: 'none',
      padding: '0px',
      opacity: '1',
      overflow: 'hidden',
      zIndex: '201',
    });

    anime({
      targets: backdrop,
      backgroundColor: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.8)'],
      duration: 800,
      easing: 'easeOutQuart',
    });

    expandAnimRef.current = anime({
      targets: modal,
      left: [originRect.left, finalLeft],
      top: [originRect.top, finalTop],
      width: [originRect.width, finalWidth],
      height: [originRect.height, finalHeight],
      padding: ['0px', '40px'],
      duration: 850,
      easing: 'cubicBezier(0.16, 1, 0.3, 1)',
      complete: () => {
        modal.style.overflow = 'auto';
      },
    });
    const content = modal.querySelector('.expand-content');
    if (content) {
      content.style.opacity = '0';
      anime({
        targets: content,
        opacity: [0, 1],
        translateY: [12, 0],
        duration: 600,
        delay: 350,
        easing: 'cubicBezier(0.22, 1, 0.36, 1)',
      });
    }
  }, [expandedCard, originRect]);

  const handleCloseExpanded = () => {
    const modal = expandModalRef.current;
    const backdrop = expandBackdropRef.current;
    if (!modal || !originRect) {
      if (originRect?.cardEl) originRect.cardEl.style.visibility = '';
      setExpandedCard(null);
      setOriginRect(null);
      return;
    }
    if (expandAnimRef.current) expandAnimRef.current.pause();

    const currentRect = modal.getBoundingClientRect();
    Object.assign(modal.style, {
      position: 'fixed',
      margin: '0',
      left: `${currentRect.left}px`,
      top: `${currentRect.top}px`,
      width: `${currentRect.width}px`,
      height: `${currentRect.height}px`,
      maxWidth: 'none',
      maxHeight: 'none',
      overflow: 'hidden',
    });

    const content = modal.querySelector('.expand-content');
    if (content) {
      anime({
        targets: content,
        opacity: [1, 0],
        translateY: [0, 8],
        duration: 180,
        easing: 'easeInQuad',
      });
    }
    if (backdrop) {
      anime({
        targets: backdrop,
        backgroundColor: ['rgba(0,0,0,0.8)', 'rgba(0,0,0,0)'],
        duration: 450,
        easing: 'easeInQuad',
      });
    }

    expandAnimRef.current = anime({
      targets: modal,
      left: [currentRect.left, originRect.left],
      top: [currentRect.top, originRect.top],
      width: [currentRect.width, originRect.width],
      height: [currentRect.height, originRect.height],
      padding: ['40px', '0px'],
      duration: 450,
      easing: 'cubicBezier(0.5, 0, 0.75, 0)',
      complete: () => {
        if (originRect.cardEl) originRect.cardEl.style.visibility = '';
        setExpandedCard(null);
        setOriginRect(null);
      },
    });
  };
  const r = (hex) => parseInt(hex.slice(1, 3), 16);
  const g = (hex) => parseInt(hex.slice(3, 5), 16);
  const b = (hex) => parseInt(hex.slice(5, 7), 16);

  const renderCard = (card) => {
    const hasBg = Boolean(card.bgImage);
    return (
      <div
        key={card.id}
        className={`scatter-card scatter-${card.slot}`}
        onClick={(e) => handleCardClick(card.id, e)}
      >
        <div
          className="card-inner"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            e.currentTarget.style.setProperty('--shine-x', `${x}%`);
            e.currentTarget.style.setProperty('--shine-y', `${y}%`);
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.removeProperty('--shine-x');
            e.currentTarget.style.removeProperty('--shine-y');
          }}
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            alignItems: 'flex-start',
            borderRadius: '14px',
            overflow: 'hidden',
            background: hasBg
              ? `linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.75) 100%), url(${card.bgImage}) center/cover no-repeat`
              : `linear-gradient(135deg, rgba(${r(card.color)}, ${g(card.color)}, ${b(card.color)}, 0.18), rgba(${r(card.color)}, ${g(card.color)}, ${b(card.color)}, 0.05))`,
            border: `2px solid ${card.color}`,
            padding: '18px 20px',
            position: 'relative',
            textAlign: 'left',
            boxSizing: 'border-box',
          }}
        >
          <div className="card-label-scatter" style={{ color: card.color }}>
            ◆ {card.title} ◆
          </div>
          <h2 className="card-title-scatter" style={{ textShadow: `0 2px 10px rgba(0,0,0,0.8), 0 0 20px ${card.color}60` }}>
            {card.subtitle}
          </h2>
          <p className="card-description-scatter">
            {card.description}
          </p>
        </div>
      </div>
    );
  };
  const expandedCardData = cards.find(c => c.id === expandedCard);
  const stopBubble = (e) => e.stopPropagation();
  return (
    <div className={`about-overlay-wrapper ${isAnimatingOut ? 'no-pointer' : ''}`}>
      <div ref={overlayRef} className="about-overlay-bg-black" />
      <div ref={bgRef} className="about-overlay-bg-pattern" />
      <button onClick={onClose} className="about-close-button">
        <X style={{ width: 22, height: 22, color: '#f87171' }} />
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
        <div className="scatter-stage">
          <div className="scatter-hero">
            <img src="/gojo.png" alt="hero" className="scatter-hero-img" draggable={false} />
          </div>
          {cards.map(renderCard)}
        </div>
      </div>
      {expandedCard && (
        <div
          ref={expandBackdropRef}
          className="expand-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseExpanded();
          }}
        >
          <div
            ref={expandModalRef}
            className="expand-modal hide-scrollbar"
            style={{
              border: `2px solid ${expandedCardData.color}`,
              boxShadow: `0 0 60px ${expandedCardData.color}40`,
            }}
          >
            <button
              onClick={handleCloseExpanded}
              className="expand-close-button"
              style={{
                border: `2px solid ${expandedCardData.color}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `${expandedCardData.color}20`;
                e.currentTarget.style.boxShadow = `0 0 20px ${expandedCardData.color}60`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(10, 10, 10, 0.85)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <X style={{ width: 20, height: 20, color: expandedCardData.color }} />
            </button>
            <div className="expand-content">
              <div className="expand-label" style={{ color: expandedCardData.color }}>
                ◆ {expandedCardData.title} ◆
              </div>
              <h1 className="expand-title" style={{ textShadow: `0 0 30px ${expandedCardData.color}80, 0 0 60px ${expandedCardData.color}40` }}>
                {expandedCardData.subtitle}
              </h1>
              <div className="expand-divider" style={{ background: `linear-gradient(90deg, transparent, ${expandedCardData.color}, transparent)` }} />
              
              {expandedCardData.id === 'anime' ? (
                <div className="expand-video-wrapper">
                  <VideoCarousel active={expandedCard === 'anime'} />
                </div>
              ) : (
                <>
                  <p className="expand-description">
                    {expandedCardData.description}
                  </p>
                  <p className="expand-full-content">
                    {expandedCardData.fullContent}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
