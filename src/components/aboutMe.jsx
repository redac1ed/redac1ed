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
  const expandAnimRef = useRef(null);

  const cards = [
    {
      id: 'about',
      title: 'About Me',
      subtitle: 'redac1ed',
      description: 'A developer obsessed with crafting immersive web experiences — blending 3D graphics, animation, and clean code into something that feels alive.',
      fullContent: 'Passionate about React, Three.js, and pushing the limits of what a browser can render.',
      size: 'large',
      color: '#cc1111'
    },
    {
      id: 'anime',
      title: 'Anime',
      subtitle: 'REELS',
      description: 'Creative video projects and animations',
      fullContent: 'Explore my anime and animation work',
      size: 'small',
      color: '#006793'
    },
    {
      id: 'likes',
      title: 'What I Like',
      subtitle: '♡',
      description: 'Things that inspire me',
      fullContent: 'My interests and passions',
      size: 'small',
      color: '#cc1111'
    },
    {
      id: 'games',
      title: 'Games',
      subtitle: '◆',
      description: 'Gaming and interactive experiences',
      fullContent: 'My favorite games and projects',
      size: 'small',
      color: '#1a7a5c'
    },
    {
      id: 'other',
      title: 'Other',
      subtitle: '✦',
      description: 'More about me',
      fullContent: 'Additional interests and hobbies',
      size: 'small',
      color: '#7a3a1a'
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

  const handleCardClick = (cardId) => {
    setExpandedCard(cardId);
    if (expandAnimRef.current) expandAnimRef.current.pause();
    
    expandAnimRef.current = anime({
      targets: '.expand-modal',
      scale: [0.5, 1],
      opacity: [0, 1],
      duration: 400,
      easing: 'easeOutCubic'
    });
  };

  const handleCloseExpanded = () => {
    if (expandAnimRef.current) expandAnimRef.current.pause();
    
    expandAnimRef.current = anime({
      targets: '.expand-modal',
      scale: [1, 0.5],
      opacity: [1, 0],
      duration: 300,
      easing: 'easeInCubic',
      complete: () => setExpandedCard(null)
    });
  };

  const CardComponent = ({ card, isLarge }) => (
    <div
      className={`card-item ${isLarge ? 'card-item-large' : 'card-item-small'}`}
      onClick={() => handleCardClick(card.id)}
      style={{
        background: `linear-gradient(135deg, rgba(${parseInt(card.color.slice(1, 3), 16)}, ${parseInt(card.color.slice(3, 5), 16)}, ${parseInt(card.color.slice(5, 7), 16)}, 0.1), rgba(${parseInt(card.color.slice(1, 3), 16)}, ${parseInt(card.color.slice(3, 5), 16)}, ${parseInt(card.color.slice(5, 7), 16)}, 0.05))`,
        border: `2px solid ${card.color}`,
      }}
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
        e.currentTarget.style.background = `linear-gradient(135deg, rgba(${parseInt(card.color.slice(1, 3), 16)}, ${parseInt(card.color.slice(3, 5), 16)}, ${parseInt(card.color.slice(5, 7), 16)}, 0.1), rgba(${parseInt(card.color.slice(1, 3), 16)}, ${parseInt(card.color.slice(3, 5), 16)}, ${parseInt(card.color.slice(5, 7), 16)}, 0.05))`;
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div className={`card-label ${isLarge ? 'card-label-large' : 'card-label-small'}`} style={{ color: card.color }}>
        ◆ {card.title} ◆
      </div>
      <h2 className={`card-title ${isLarge ? 'card-title-large' : 'card-title-small'}`} style={{ textShadow: `0 0 20px ${card.color}80, 0 0 40px ${card.color}40` }}>
        {card.subtitle}
      </h2>
      <div className={`card-divider ${isLarge ? 'card-divider-large' : 'card-divider-small'}`} style={{ background: `linear-gradient(90deg, transparent, ${card.color}, transparent)` }} />
      <p className={`card-description ${isLarge ? 'card-description-large' : 'card-description-small'}`}>
        {card.description}
      </p>
    </div>
  )
  const expandedCardData = cards.find(c => c.id === expandedCard);

  return (
    <div className={`about-overlay-wrapper ${isAnimatingOut ? 'no-pointer' : ''}`}>
      <div ref={overlayRef} className="about-overlay-bg-black" />
      <div ref={bgRef} className="about-overlay-bg-pattern" />
      
      <button onClick={onClose} className="about-close-button">
        <X style={{ width: 22, height: 22, color: '#f87171' }} />
      </button>

      <div ref={containerRef} className="about-container hide-scrollbar">
        <div className="about-grid">
          {cards.map(card => (
            <CardComponent
              key={card.id}
              card={card}
              isLarge={card.size === 'large'}
            />
          ))}
        </div>
      </div>

      {expandedCard && (
        <div className="expand-backdrop" onClick={(e) => {
          if (e.target === e.currentTarget) handleCloseExpanded();
        }}>
          <div
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
