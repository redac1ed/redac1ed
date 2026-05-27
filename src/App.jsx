import { useState, useCallback, useRef, useEffect, lazy, Suspense } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import anime from 'animejs';
import StartupAnimation from './components/startup';
import AnimeBackground from './components/bg';
const AboutMeOverlay = lazy(() => import('./components/aboutMe'));

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
  const [showStartup, setShowStartup] = useState(true);
  const [rotationTarget, setRotationTarget] = useState(null);
  const [currentFace, setCurrentFace] = useState(0);
  const [showAbout, setShowAbout] = useState(false);
  const [rushTarget, setRushTarget] = useState(null);
  const [flashing, setFlashing] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const minSwipeDistance = 50;
  const rotateLeft = useCallback(() => {
    if (rotationTarget !== null) return; 
    setRotationTarget(-1);
    setCurrentFace(prev => (prev + 1) % 4);
  }, [rotationTarget]);
  const rotateRight = useCallback(() => { 
    if (rotationTarget !== null) return; 
    setRotationTarget(1);
    setCurrentFace(prev => (prev - 1 + 4) % 4);
  }, [rotationTarget]);
  const onTouchStart = useCallback((e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches ? e.targetTouches[0].clientX : e.clientX);
    if (!e.targetTouches) setIsMouseDown(true);
  }, []);
  const onTouchMove = useCallback((e) => {
    if (e.targetTouches || isMouseDown) {
      setTouchEnd(e.targetTouches ? e.targetTouches[0].clientX : e.clientX);
    }
  }, [isMouseDown]);
  const onTouchEnd = useCallback(() => {
    setIsMouseDown(false);
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) { rotateRight(); }
    if (isRightSwipe) { rotateLeft(); }
  }, [touchStart, touchEnd, rotateLeft, rotateRight]);
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
      <style>{`
        html, body, #root {
          width: 100%;
          height: 100%;
          margin: 0;
          padding: 0;
          overflow: hidden;
        }
      `}</style>
      <div
        onMouseDown={onTouchStart}
        onMouseMove={onTouchMove}
        onMouseUp={onTouchEnd}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          width: '100%',
          height: '100%',
          pointerEvents: showStartup ? 'none' : 'auto'
        }}
      >
        <AnimeBackground
          zoomed={false}
          rotationTarget={rotationTarget}
          currentFace={currentFace}
          onRotationComplete={handleRotationComplete}
          onAboutOpen={handleAboutOpen}
          rushTarget={rushTarget}
          onRushComplete={handleRushComplete}
        />
        {(rushTarget?.type === 'in' || showAbout) && (
          <Suspense fallback={null}>
            <AboutMeOverlay
              onClose={handleAboutClose}
              isAnimatingIn={rushTarget?.type === 'in'}
              isAnimatingOut={rushTarget?.type === 'out'}
              onOutComplete={handleOutComplete}
            />
          </Suspense>
        )}
        <button
          onClick={rotateLeft}
          disabled={showStartup}
          style={{ 
            position: 'fixed', left: 24, top: '50%', transform: 'translateY(-50%)', 
            width: 56, height: 56, borderRadius: '50%', background: 'rgba(10,10,10,0.85)', 
            border: '2px solid #ffffff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 50,
            pointerEvents: showStartup ? 'none' : 'auto'
          }}
        >
          <ChevronLeft style={{ width: 28, height: 28, color: '#ffffff' }} /> 
        </button>
        <button
          onClick={rotateRight}
          disabled={showStartup}
          style={{ 
            position: 'fixed', right: 24, top: '50%', transform: 'translateY(-50%)', 
            width: 56, height: 56, borderRadius: '50%', background: 'rgba(10,10,10,0.85)', 
            border: '2px solid #ffffff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 50,
            pointerEvents: showStartup ? 'none' : 'auto'
          }}
        >
          <ChevronRight style={{ width: 28, height: 28, color: '#ffffff' }} /> 
        </button>
      </div>
      {showStartup && <StartupAnimation onComplete={() => setShowStartup(false)} />}
    </>
  );
}
