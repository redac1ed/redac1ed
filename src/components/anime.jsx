import { useState, useRef, useEffect } from 'react';

const videos = [
  { src: '/cote.mp4', maxTime: 89 },   
  { src: '/jjk.mp4', maxTime: 90 },  
  { src: '/sxf.mp4', maxTime: 89 },
  { src: '/ylia.mp4', maxTime: 90 },  
];

export default function VideoCarousel({ active }) {
  const [rotation, setRotation] = useState(0);
  const videoRefs = useRef([]);
  const scrollLock = useRef(false);
  const containerRef = useRef(null);
  const n = videos.length;
  const step = 360 / n;
  const currentIndex = ((Math.round(rotation / step) % n) + n) % n;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleWheel = (e) => {
      if (!active) return;
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
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [active, step]);

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
  }, [active]);

  useEffect(() => {
    videoRefs.current.forEach((video, i) => {
      if (!video) return;
      const oppositeIndex = (currentIndex + Math.floor(n / 2)) % n;
      if (i === oppositeIndex && active) {
        video.muted = false;
        video.play().catch(() => {});
      } else {
        video.muted = true;
        video.pause();
      }
    });
  }, [currentIndex, active, n]);

  if (!active) return null;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background: 'radial-gradient(circle, #2a2a2a 1px, #0a0a0a 1px)',
        backgroundSize: '20px 24px',
        perspective: '900px',
        borderRadius: 8,
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          transformStyle: 'preserve-3d',
          transform: `rotateY(${-rotation}deg)`,
          transition: 'transform 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          position: 'relative',
        }}
      >
        {videos.map(({ src }, i) => {
          const angle = (i / n) * 360;
          const radius = 1500;
          return (
            <div
              key={src}
              style={{
                position: 'absolute',
                width: '400px',
                height: '220px',
                left: '50%',
                top: '50%',
                marginLeft: '-200px',
                marginTop: '-110px',
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
                  borderRadius: '8px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
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
