import { useState, useCallback, lazy, Suspense } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import StartupAnimation from './components/startup';
import AnimeBackground from './components/bg';
const AboutMeOverlay = lazy(() => import('./components/aboutMe'));
const ContactOverlay = lazy(() => import('./components/contact'));

export default function App() {
  const [showStartup, setShowStartup] = useState(true);
  const [rotationTarget, setRotationTarget] = useState(null);
  const [currentFace, setCurrentFace] = useState(0);
  const [showAbout, setShowAbout] = useState(false);
  const [rushTarget, setRushTarget] = useState(null);
  const [showContact, setShowContact] = useState(false);
  const [contactRush, setContactRush] = useState(null);
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
  const handleContactOpen = useCallback(() => setContactRush({ type: 'in', ts: Date.now() }), []);
  const handleContactClose = useCallback(() => setContactRush({ type: 'out', ts: Date.now() }), []);
  const handleContactOut = useCallback(() => { setShowContact(false); setContactRush(null); }, []);

  return (
    <>
      <div className="mobile-blocker">
        <img src="/mobile-page.jpeg" alt="" className="mobile-blocker-img" />
      </div>
      <div
        className={`app-root${showStartup ? ' is-startup' : ''}`}
        onMouseDown={onTouchStart}
        onMouseMove={onTouchMove}
        onMouseUp={onTouchEnd}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <AnimeBackground
          zoomed={false}
          rotationTarget={rotationTarget}
          currentFace={currentFace}
          onRotationComplete={handleRotationComplete}
          onAboutOpen={handleAboutOpen}
          onContactOpen={handleContactOpen}
          rushTarget={rushTarget}
          onRushComplete={handleRushComplete}
        />
        {(contactRush?.type === 'in' || showContact) && (
          <Suspense fallback={null}>
            <ContactOverlay
              onClose={handleContactClose}
              isAnimatingIn={contactRush?.type === 'in'}
              isAnimatingOut={contactRush?.type === 'out'}
              onOutComplete={handleContactOut}
            />
          </Suspense>
        )}
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
          className="nav-button nav-button-left"
          onClick={rotateLeft}
          disabled={showStartup}
        >
          <ChevronLeft className="nav-button-icon" />
        </button>
        <button
          className="nav-button nav-button-right"
          onClick={rotateRight}
          disabled={showStartup}
        >
          <ChevronRight className="nav-button-icon" />
        </button>
      </div>
      {showStartup && <StartupAnimation onComplete={() => setShowStartup(false)} />}
    </>
  );
}
