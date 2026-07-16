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
    <div ref={containerRef} className="anime-carousel-stage">
      <div
        className="anime-carousel-ring"
        style={{ transform: `rotateY(${-rotation}deg)` }}
      >
        {videos.map(({ src }, i) => {
          const angle = (i / n) * 360;
          const radius = 1200;
          return (
            <div
              key={src}
              className="anime-carousel-item"
              style={{ transform: `rotateY(${angle}deg) translateZ(${radius}px) rotateY(180deg)` }}
            >
              <video
                ref={el => videoRefs.current[i] = el}
                src={src}
                className="anime-carousel-video"
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
