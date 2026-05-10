import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Hero() {
  const { scrollY } = useScroll();
  const videoY = useTransform(scrollY, [0, 900], [0, 90]);
  const videoScale = useTransform(scrollY, [0, 900], [1, 1.1]);
  const contentY = useTransform(scrollY, [0, 900], [0, -28]);
  const contentOpacity = useTransform(scrollY, [0, 650], [1, 0.72]);
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.2 }
    }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 30, filter: 'blur(10px)' },
    visible: { 
      opacity: 1, 
      y: 0, 
      filter: 'blur(0px)',
      transition: { type: 'spring', stiffness: 100, damping: 20, mass: 1 }
    }
  };
  const TYPING_WORDS = ['web applications', 'entertaining games', 'and more!'];
  const [wordIndex, setWordIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % TYPING_WORDS.length);
    }, 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="hero-section">
      <motion.div style={{ y: videoY, scale: videoScale }} className="hero-bg-motion">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="hero-video"
        >
          <source src="/bg.mp4" type="video/mp4" />
        </video>
        <div className="hero-overlay" />
      </motion.div>

      <motion.div 
        style={{ y: contentY, opacity: contentOpacity, scale: useTransform(scrollY, [0, 650], [1, 0.95]) }}
        className="hero-content"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      > 
        <motion.h1 variants={itemVariants} className="hero-title">
          Hi, I'm <span className="hero-name">
            redac1ed
            <motion.span 
              className="hero-name-underline"
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ delay: 1, duration: 0.8, ease: "easeOut" }}
            />
          </span>.
        </motion.h1>
        <motion.div variants={itemVariants} className="hero-typing-row">
          <span className="hero-typing-prefix">I build...</span>
          <span className="hero-typing-word-shell" aria-live="polite">
            <AnimatePresence mode="wait">
              <motion.span
                key={TYPING_WORDS[wordIndex]}
                className="hero-typing-word"
                initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
              >
                {TYPING_WORDS[wordIndex]}
              </motion.span>
            </AnimatePresence>
          </span>
        </motion.div>
        <motion.p variants={itemVariants} className="hero-description">
        </motion.p>
        <motion.div variants={itemVariants} className="hero-cta-row">
          <a href="#projects" className="hero-cta-primary">
            View My Work
            <ArrowRight className="hero-cta-primary-icon" />
          </a>
        </motion.div>
      </motion.div>
    </section>
  );
}
