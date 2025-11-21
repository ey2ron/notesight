import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "../../components/Navigation/Navigation";
import musicIcon from "./assets/music.png";
import secureIcon from "./assets/secure.png";
import soundIcon from "./assets/sound.png";
import userIcon from "./assets/user.png";
import member3 from "./assets/pic3.jpg";
import leader from "./assets/hahaha.jpg";
import jop from "./assets/jop.jpg";
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
    name: "Jeoffrey Delos Reyes",
    role: "Frontend Dev",
    bio: "Builds intuitive interfaces so every feature feels effortless to explore.",
    image: jop,
  },
  {
    name: "Aaron Clyde Guiruela",
    role: "Product Lead/Fullstack Dev",
    bio: "Leads NoteSight’s roadmap with sharp product instincts and reliable fullstack execution.",
    image: leader,
  },
  {
    name: "John Russel Gallanosa",
    role: "UI/UX Designer",
    bio: "Crafts intuitive NoteSight journeys so every musician feels guided, confident, and inspired.",
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
          </div>
          <div className="hero-spacer" aria-hidden="true">
            <div className="spacer">
              <p>                                           </p>
            </div>
            <div className="hero-description">
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
          </div>
        </section>

        <section id="features" className="features-section">
          <header className="section-header">
            <p className="eyebrow"></p>
            <h2>Let your sheet music come to life with every note</h2>
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
            <p className="team-grid__label">Our Team</p>
            {teamMembers.map((member) => (
              <article className="team-card" key={member.name} tabIndex={0}>
                <div className="team-card__image" aria-hidden="true">
                  <img src={member.image} alt="" />
                </div>
                <div className="team-card__details">
                  <span className="team-card__role">{member.role}</span>
                  <h4>{member.name}</h4>
                  <p className="team-card__bio">{member.bio}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <p>© 2025 NoteSight. All rights reserved.</p>
      </footer>
    </div>
  );
}
