import { motion } from 'framer-motion';

const skills = [
  { category: "Languages", items: ["JavaScript", "TypeScript", "Python", "HTML/CSS", "SQL", "GDScript"] },
  { category: "Frameworks", items: ["React", "TailwindCSS", "Flask"] },
  { category: "Tools", items: ["Git", "GitHub", "VS Code", "npm"] },
];

export default function Skills() {
  return (
    <section className="skills-section">
      <div className="skills-bg" />
      <div className="section-container">
        <motion.div 
          initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="section-heading"
        >
          <h2 className="section-title">
            Tech <span className="section-title-gradient">Stack</span>
          </h2>
          <p className="section-subtitle">
            The tools and technologies I use to bring ideas to life.
          </p>
        </motion.div>
        <div className='skills-scroller' role='region' aria-label='Skills'>
          <div className="skills-grid">
            {skills.map((group, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
                whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: index * 0.15, duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="skill-card"
              >
                <h3 className="skill-card-title">
                  {group.category}
                </h3>
                <div className="skill-items">
                  {group.items.map((item, i) => (
                    <motion.span 
                      key={i} 
                      whileHover={{ backgroundColor: "rgba(255,255,255,1)", color: "rgba(0,0,0,1)" }}
                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                      className="skill-pill"
                    >
                      {item}
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
