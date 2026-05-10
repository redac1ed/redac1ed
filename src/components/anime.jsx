import { useState, useRef, useEffect } from 'react';

const videos = [
  { src: '/cote.mp4', maxTime: 89 },   
  { src: '/jjk.mp4', maxTime: 90 },  
  { src: '/sxf.mp4', maxTime: 89 },
  { src: '/ylia.mp4', maxTime: 90 },  
];

export default function VideoCarousel({ zoomed }) {
  const [rotation, setRotation] = useState(0);
  const videoRefs = useRef([]);
  const scrollLock = useRef(false);
  const n = videos.length;
  const step = 360 / n;
  const currentIndex = ((Math.round(rotation / step) % n) + n) % n;

  useEffect(() => {
    const handleWheel = (e) => {
      if (!zoomed) return;
      e.preventDefault();
      if (scrollLock.current) return;
      scrollLock.current = true;
      setTimeout(() => { scrollLock.current = false; }, 700);
      const delta = e.deltaY !== 0 ? e.deltaY : e.deltaX;
      if (delta > 0) {
        setRotation((prev) => prev + step);
      } else if (delta < 0) {
        setRotation((prev) => prev - step);
      }
    };
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [zoomed, step]);

  useEffect(() => {
    const handlers = [];
    videoRefs.current.forEach((video, i) => {
      if (!video) return;
      const handler = () => {
        if (video.currentTime >= videos[i].maxTime) {
          video.currentTime = 0;
        }
      };
      video.addEventListener('timeupdate', handler);
      handlers.push({ video, handler });
    });
    return () => {
      handlers.forEach(({ video, handler }) => {
        video.removeEventListener('timeupdate', handler);
      });
    };
  }, [zoomed]);

  useEffect(() => {
    videoRefs.current.forEach((video, i) => {
      if (!video) return;
      const oppositeIndex = (currentIndex + Math.floor(n / 2)) % n;
      if (i === oppositeIndex && zoomed) {
        video.muted = false;
        video.play().catch(() => {});
      } else {
        video.muted = true;
        video.pause();
      }
    });
  }, [currentIndex, zoomed, n]);
  if (!zoomed) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center overflow-hidden"
      style={{
        background: 'radial-gradient(circle, #2a2a2a 1px, #0a0a0a 1px)',
        backgroundSize: '20px 24px',
        perspective: '1900px',
      }}
    >
      <div
        style={{
          width: '100vw',
          height: '100vh',
          transformStyle: 'preserve-3d',
          transform: `rotateY(${-rotation}deg)`,
          transition: 'transform 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          position: 'relative',
        }}
      >
        {videos.map(({ src }, i) => {
          const angle = (i / n) * 360;
          const radius = 1900;
          return (
            <div
              key={src}
              style={{
                position: 'absolute',
                width: '1400px',
                height: '600px',
                left: '50%',
                top: '50%',
                marginLeft: '-700px',
                marginTop: '-300px',
                transformStyle: 'preserve-3d',
                transform: `rotateY(${angle}deg) translateZ(${radius}px) rotateY(180deg)`,
              }}
            >
              <video
                ref={el => videoRefs.current[i] = el}
                src={src}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                  pointerEvents: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
                }}
                loop
                playsInline
                muted
                disablePictureInPicture
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
