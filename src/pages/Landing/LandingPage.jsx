import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "../../components/Navigation/Navigation";
import musicIcon from "./assets/music.png";
import secureIcon from "./assets/secure.png";
import soundIcon from "./assets/sound.png";
import userIcon from "./assets/user.png";
import member3 from "./assets/pic3.jpg";
import "./LandingPage.css";

const featureCards = [
  {
    icon: soundIcon,
    text: "Instant audio playback of uploaded sheet music",
  },
  {
    icon: musicIcon,
    text: "Support for a wide range of musical symbols",
  },
  {
    icon: userIcon,
    text: "Intuitive interface that keeps you focused on music",
  },
  {
    icon: secureIcon,
    text: "Secure processing with your privacy in mind",
  },
];

const teamMembers = [
  {
    name: "Aaron Clyde Guiruela",
    role: "Product Lead",
    image: "/images/member1.jpg",
  },
  {
    name: "Jeoffrey Delos Reyes",
    role: "Frontend Engineer",
    image: "/images/member2.jpg",
  },
  {
    name: "John Russel Gallanosa",
    role: "Backend Engineer",
    image: member3,
  },
];

export function LandingPage({ section }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!section) {
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      });
      return;
    }

    const el = document.getElementById(section);
    if (el) {
      window.requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [section]);

  const handleGetStarted = () => navigate("/signup");

  return (
    <div className="landing-page">
      <Navigation />

      <main className="landing-main">
        <section id="hero" className="hero-section">
          <div className="hero-content">
            <h1>See the notes. Hear the future.</h1>
            <p>
              NoteSight transforms photos of sheet music into vivid audio in seconds.
              Upload, listen, and learn without the hurdles of traditional practice.
            </p>
            <div className="hero-actions">
              <button type="button" className="primary-action" onClick={handleGetStarted}>
                Get Started
              </button>
              <button type="button" className="secondary-action" onClick={() => navigate("/login")}>
                Sign In
              </button>
            </div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="visual-card">
              <span>Upload. Analyze. Play.</span>
            </div>
          </div>
        </section>

        <section id="features" className="features-section">
          <header className="section-header">
            <p className="eyebrow">Features</p>
            <h2>Everything you need to hear your sheet music come alive</h2>
          </header>
          <div className="features-grid">
            {featureCards.map((card, index) => (
              <article className="feature-card" key={index}>
                <img src={card.icon} alt="Feature icon" />
                <p>{card.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="about" className="about-section">
          <header className="section-header">
            <p className="eyebrow">About</p>
            <h2>Built by musicians who love great tools</h2>
            <p className="section-description">
              We designed NoteSight to remove friction from practice. Whether you are
              rehearsing with a choir, arranging for a quartet, or studying solo, we help
              you hear the score instantly.
            </p>
          </header>

          <div className="mission-grid">
            <div className="mission-card">
              <h3>Our mission</h3>
              <p>
                Deliver fast, reliable optical music recognition that makes musical discovery
                accessible to every learner.
              </p>
            </div>
            <div className="mission-card">
              <h3>What drives us</h3>
              <p>
                Helping musicians spend more time creating and less time deciphering notation.
              </p>
            </div>
          </div>

          <div className="team-grid">
            {teamMembers.map((member) => (
              <article className="team-card" key={member.name}>
                <div className="team-avatar">
                  <img src={member.image} alt={member.name} />
                </div>
                <h4>{member.name}</h4>
                <p>{member.role}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="contact-section">
          <div className="contact-card">
            <h3>Have a project or feature request?</h3>
            <p>
              Reach out at <a href="mailto:hello@notesight.app">hello@notesight.app</a> and
              we&apos;ll get back within two business days.
            </p>
            <button type="button" onClick={handleGetStarted} className="primary-action">
              Try NoteSight now
            </button>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <p>© 2025 NoteSight. All rights reserved.</p>
      </footer>
    </div>
  );
}
