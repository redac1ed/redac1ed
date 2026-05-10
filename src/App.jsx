import { useState } from 'react';
import AnimeBackground from './components/bg';
import VideoCarousel from './components/anime';
import StartupAnimation from './components/startup';

export default function App() {
  const [zoomed, setZoomed] = useState(false);
  const [showStartup, setShowStartup] = useState(true);
  return (
    <>
      {showStartup && <StartupAnimation onComplete={() => setShowStartup(false)} />}
      <AnimeBackground zoomed={zoomed} />
      <VideoCarousel zoomed={zoomed} />
      <button
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full shadow-lg transition-colors"
        onClick={() => setZoomed(!zoomed)}
      >
        {zoomed ? 'Zoom Out' : 'Zoom In'}
      </button>
    </>
  );
}
