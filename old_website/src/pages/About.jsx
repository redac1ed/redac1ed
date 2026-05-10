const About = () => {
  return (
    <section className="about-section">
      <div className="section-container">
        <div className="about-layout">
          <div className="about-left">
            <h1 className="about-title">
              About me 
            </h1>
            <p className="about-copy about-copy-spaced">
              I am redac1ed, a self-taught programmer with experience in Python, React, JS and more!
            </p>
            <p className="about-copy about-copy-last">
              There is nothing much about me, since I am a very private person. Though, my other interests are Chess, Speedcubing, Maths/Physics and Memes.
            </p>
            <p className="about-copy about-copy-last">
              Feel free to contact me about projects, collaborations or anything else!
            </p>
            {/* <div className="about-feature-grid">
              <div className="about-feature-card">
                <h3 className="about-feature-title">Frontend</h3>
                <p className="about-feature-copy">React, JS, UI animations</p>
              </div>

              <div className="about-feature-card">
                <h3 className="about-feature-title">Backend</h3>
                <p className="about-feature-copy">APIs, Python basics</p>
              </div>

              <div className="about-feature-card">
                <h3 className="about-feature-title">Game Dev</h3>
                <p className="about-feature-copy">Godot experiments</p>
              </div>

              <div className="about-feature-card">
                <h3 className="about-feature-title">Current Goal</h3>
                <p className="about-feature-copy">Clean full-stack projects</p>
              </div>
            </div> */}
          </div>
        <div className="about-right">
            <div className="about-code-shell">
                <img
                src="/aboutme.webp"
                alt="About me"
                className="about-image"
                loading="lazy"
                />
            </div>
        </div>
        </div>
      </div>
    </section>
  );
};

export default About;