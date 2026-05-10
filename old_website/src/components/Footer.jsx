import { SiGithub, SiGmail, SiDiscord } from '@icons-pack/react-simple-icons';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const startDate = new Date('2024-01-14'); // dang im old
const now = new Date();
let years = now.getFullYear() - startDate.getFullYear();
const hasNotReachedAnniversary =
  now.getMonth() < startDate.getMonth() ||
  (now.getMonth() === startDate.getMonth() && now.getDate() < startDate.getDate());
if (hasNotReachedAnniversary) years -= 1;
const experienceLabel = ` ${Math.max(0, years)}+ years of experience`;

const Footer = () => {
  return (
    <footer className="footer-root">
      <div className="footer-glow" />
      <div className="section-container">
        <div className="footer-grid">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            // transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="footer-brand-col"
          >
            <Link to="/" className="footer-brand-link">
              redac1ed
            </Link>
            <p className="footer-brand-text">
              Full-Stack Developer building useful tools and web apps. 
              {experienceLabel} in React, Python, GoDot and JS.
            </p>
            <div className="footer-social-row">
              <motion.a 
                whileTap={{ scale: 0.9 }}
                href="https://github.com/redac1ed" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="footer-social-link"
              >
                <SiGithub className="icon icon-md" />
              </motion.a>
              <motion.a 
                whileTap={{ scale: 0.9 }}
                href="mailto:me@redac.me" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="footer-social-link"
              >
                <SiGmail className="icon icon-md" />
              </motion.a>
              <motion.a 
                whileTap={{ scale: 0.9 }}
                href="https://discord.com/users/1372948263283724319"
                target="_blank" 
                rel="noopener noreferrer"  
                className="footer-social-link"
              >
                <SiDiscord className="icon icon-md" />
              </motion.a>
            </div>
          </motion.div>
        </div>
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="footer-bottom"
        >
          <p>© {new Date().getFullYear()} redac.me. All rights reserved.</p>
        </motion.div>
      </div>
    </footer>
  );
};

export default Footer;
