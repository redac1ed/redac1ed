import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { SiGithub } from '@icons-pack/react-simple-icons';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const links = [
      { name: 'Home', path: '/' },
      { name: 'About', path: '/about' },
      { name: 'Projects', path: '/projects' },
    ];
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)');

    const handleViewportChange = (event) => {
      if (event.matches) {
        setIsOpen(false);
      }
    };

    if (mediaQuery.matches) {
      setIsOpen(false);
    }

    mediaQuery.addEventListener('change', handleViewportChange);
    return () => mediaQuery.removeEventListener('change', handleViewportChange);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <motion.nav 
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={`nav-shell ${'nav-shell--top'}`}
    >
      <div className="section-container nav-inner">
        {/* Desktop Menu */}
        <div className="nav-desktop-menu">
          {links.map((link) => (
            <Link 
              key={link.path} 
              to={link.path} 
              className={`nav-link ${location.pathname === link.path ? 'nav-link--active' : 'nav-link--inactive'}`}
            >
              {link.name}
              {location.pathname === link.path && (
                <motion.span 
                  layoutId="navbar-indicator"
                  className="nav-link-indicator"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </Link>
          ))}
          <motion.a 
            whileTap={{ scale: 0.9 }}
            href="https://github.com/redac1ed" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="nav-github-link"
          >
            <SiGithub className="icon icon-md" />
          </motion.a>
        </div>

        {/* Mobile Menu Button */}
        {!isOpen && (
          <motion.button 
            whileTap={{ scale: 0.9 }}
            className="nav-mobile-toggle"
            onClick={() => setIsOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="icon icon-lg" />
          </motion.button>
        )}
      </div>
      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="nav-mobile-panel"
            onClick={() => setIsOpen(false)}
          >
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="nav-mobile-drawer"
              onClick={(event) => event.stopPropagation()}
            >
              <motion.button
                whileTap={{ scale: 0.9 }}
                className="nav-mobile-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close menu"
              >
                <X className="icon icon-lg" />
              </motion.button>
              <div className="nav-mobile-links">
                {links.map((link, i) => (
                  <motion.div
                    key={link.path}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.08 + i * 0.06 }}
                  >
                    <Link 
                      to={link.path} 
                      className={`nav-mobile-link ${location.pathname === link.path ? 'nav-mobile-link--active' : 'nav-mobile-link--inactive'}`}
                      onClick={() => setIsOpen(false)}
                    >
                      {link.name}
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;
