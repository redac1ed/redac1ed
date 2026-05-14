import { useState, useCallback, useRef, useEffect } from 'react';
import AnimeBackground from './components/bg';
import VideoCarousel from './components/anime';
import StartupAnimation from './components/startup';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import anime from 'animejs';
import AboutMeOverlay from './components/aboutMe';

function RushFlash({ onComplete }) {
  const ref = useRef();
  useEffect(() => {
    if (!ref.current) return;
    anime({
      targets: ref.current,
      opacity: [0, 0.9],
      duration: 1200,
      easing: 'easeInQuad',
      complete: () => { if (onComplete) onComplete(); },
    });
  }, [onComplete]);
  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99,
        background: '#000000',
        opacity: 0,
        pointerEvents: 'none',
      }}
    />
  );
}

export default function App() {
  const [zoomed, setZoomed] = useState(false);
  const [showStartup, setShowStartup] = useState(true);
  const [rotationTarget, setRotationTarget] = useState(null);
  const [currentFace, setCurrentFace] = useState(0);
  const [showAbout, setShowAbout] = useState(false);
  const [rushTarget, setRushTarget] = useState(null);
  const [flashing, setFlashing] = useState(false);

  const rotateLeft = () => {
    if (rotationTarget !== null) return; 
    setRotationTarget(-1);
    setCurrentFace(prev => (prev + 1) % 4);
  };
  const rotateRight = () => { 
    if (rotationTarget !== null) return; 
    setRotationTarget(1);
    setCurrentFace(prev => (prev - 1 + 4) % 4);
  };
  const handleRotationComplete = useCallback(() => { setRotationTarget(null); }, []);
  const handleAboutOpen = useCallback(() => {
    setRushTarget({ type: 'in', ts: Date.now() });
  }, []);
  const handleRushComplete = useCallback(() => {
    setShowAbout(true);
  }, []);

  const handleAboutClose = useCallback(() => {
    setRushTarget({ type: 'out', ts: Date.now() });
  }, []);

  const handleOutComplete = useCallback(() => {
    setShowAbout(false);
    setRushTarget(null);
  }, []);

  return (
    <>
      {showStartup && <StartupAnimation onComplete={() => setShowStartup(false)} />}
      <AnimeBackground
        zoomed={zoomed}
        rotationTarget={rotationTarget}
        currentFace={currentFace}
        onRotationComplete={handleRotationComplete}
        onAboutOpen={handleAboutOpen}
        rushTarget={rushTarget}
        onRushComplete={handleRushComplete}
      />
      <VideoCarousel zoomed={zoomed} />
      {(rushTarget?.type === 'in' || showAbout) && <AboutMeOverlay onClose={handleAboutClose} isAnimatingIn={rushTarget?.type === 'in'} isAnimatingOut={rushTarget?.type === 'out'} onOutComplete={handleOutComplete} />}
      <button
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full shadow-lg transition-colors"
        onClick={() => setZoomed(!zoomed)}
      >
        {zoomed ? 'Zoom Out' : 'Zoom In'}
      </button>
      <button
        onClick={rotateLeft}
        style={{ position: 'fixed', left: 24, top: '50%', transform: 'translateY(-50%)', width: 56, height: 56, borderRadius: '50%', background: 'rgba(10,10,10,0.85)', border: '2px solid #ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 50 }}
        aria-label="Rotate left 90 degrees"
      >
        <ChevronLeft style={{ width: 28, height: 28, color: '#f87171' }} />
      </button>
      <button
        onClick={rotateRight}
        style={{ position: 'fixed', right: 24, top: '50%', transform: 'translateY(-50%)', width: 56, height: 56, borderRadius: '50%', background: 'rgba(10,10,10,0.85)', border: '2px solid #ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 50 }}
        aria-label="Rotate right 90 degrees"
      >
        <ChevronRight style={{ width: 28, height: 28, color: '#f87171' }} />
      </button>
    </>
  );
}
