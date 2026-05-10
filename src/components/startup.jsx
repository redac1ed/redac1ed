import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function StartupAnimation({ onComplete }) {
  const [stage, setStage] = useState('drawing');

  useEffect(() => {
    const t1 = setTimeout(() => setStage('revealing'), 2000);
    const t2 = setTimeout(() => setStage('fading'), 4500);
    const t3 = setTimeout(() => onComplete(), 5500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] pointer-events-none"
      initial={{ opacity: 1 }}
      animate={{ opacity: stage === 'fading' ? 0 : 1 }}
      transition={{ duration: 1 }}
    >
      <AnimatePresence>
        {stage === 'drawing' && (
          <motion.div
            style={{
              position: 'fixed',
              top: '50vh',
              left: '50vw',
              marginLeft: '-110px',
              marginTop: '-110px'
            }}
            initial={{ opacity: 1, scale: 1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            transition={{ duration: 1 }}
          >
            <svg
              width="220"
              height="220"
              viewBox="0 0 100 100"
              style={{ display: 'block' }}
            >
              <motion.line
                x1="45" y1="10" x2="25" y2="90"
                stroke="white"
                strokeWidth="8"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
              />
              <motion.line
                x1="75" y1="10" x2="55" y2="90"
                stroke="white"
                strokeWidth="8"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, ease: "easeInOut", delay: 0.2 }}
              />
              <motion.line
                x1="15" y1="35" x2="85" y2="35"
                stroke="white"
                strokeWidth="8"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, ease: "easeInOut", delay: 0.4 }}
              />
              <motion.line
                x1="15" y1="65" x2="85" y2="65"
                stroke="white"
                strokeWidth="8"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, ease: "easeInOut", delay: 0.6 }}
              />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
