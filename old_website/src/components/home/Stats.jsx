import { motion } from 'framer-motion';

export default function Stats() {
  return (
    <section className="stats-section">
      {/* Background Glow */}
      <div className="stats-bg" />

      <div className="section-container">
        <motion.div 
          initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="section-heading"
        >
          <h2 className="section-title">
            GitHub <span className="section-title-gradient">Stats</span>
          </h2>
          <p className="section-subtitle">
            A quick look at my open source contributions.
          </p>
        </motion.div>

        <div className="stats-grid">
          <motion.div 
            initial={{ opacity: 0, x: -40, filter: 'blur(10px)' }}
            whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            viewport={{ once: true, margin: "-50px" }}
            className="stats-card-wrap"
          >
            <img 
              src="https://github-readme-stats.vercel.app/api?username=redac1ed&include_all_commits=true&count_private=true&border_radius=15&bg_color=00000000&title_color=ffffff&text_color=a3a3a3&border_color=333333" 
              alt="GitHub Stats"
              className="stats-card-img"
            />
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 40, filter: 'blur(10px)' }}
            whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            viewport={{ once: true, margin: "-50px" }}
            className="stats-card-wrap"
          >
            <img 
              src="https://github-readme-stats.vercel.app/api/top-langs/?username=redac1ed&layout=compact&theme=graywhite&border_radius=15&bg_color=00000000&title_color=ffffff&text_color=a3a3a3&border_color=333333" 
              alt="Top Languages"
              className="stats-card-img"
            />
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
            whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            viewport={{ once: true, margin: "-50px" }}
            className="stats-activity-wrap"
          >
             <img src="https://github-readme-activity-graph.vercel.app/graph?username=redac1ed&theme=react-dark&bg_color=00000000&color=ffffff&line=555555&point=ffffff&area=true&hide_border=true" alt="Activity Graph" className="stats-activity-img" />
          </motion.div>

        </div>
      </div>
    </section>
  );
}
