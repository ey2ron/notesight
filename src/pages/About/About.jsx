import { useState } from "react";
import { Navigation } from "../../components/navigation/Navigation";
import member3 from "./assets/pic3.jpg";
import "./About.css";

const team = [
  {
    name: "Aaron Clyde Guiruela",
    image: "/images/member1.jpg",
    contributions: "PAPALTAN NALANG",
    socials: {
      github: "https://github.com/ey2ron",
      linkedin: "https://linkedin.com/in/aaron-clyde-guiruela-231237340",
    },
  },
  {
    name: "Jeoffrey Delos Reyes",
    image: "/images/member2.jpg",
    contributions: "PAPALTAN NALANG",
    socials: {
      github: "https://github.com/jofwee",
      linkedin: "https://linkedin.com/in/member2",
    },
  },
  {
    name: "John Russel Gallanosa",
    image: member3,
    contributions: "PAPALTAN NALANG",
    socials: {
      github: "https://github.com/russlen",
      linkedin: "https://linkedin.com/in/russ-gallanosa",
    },
  },
];

export function About() {
  const [selected, setSelected] = useState(null);

  return (
    <div className="about-container">
      <Navigation />
      <div className="about-header">
        <h1>About NoteSight</h1>
        <p>
          NoteSight makes reading sheet music simple and fun. Just upload a photo
          of your sheet music, and our smart OMR technology plays it back instantly.
          Whether you’re learning or composing, NoteSight brings your music to life.
        </p>
      </div>

      <div className="contact-section">
        <h2>Contact Us</h2>
        <p>
          If you have any questions, feedback, or suggestions, please feel free to
          reach out to us at{" "}
        </p>

        <div className="team-container">
          {team.map((member, index) => (
            <div
              key={index}
              className="photo-card"
              onClick={() => setSelected(member)}
            >
              <img src={member.image} alt={member.name} />
            </div>
          ))}
        </div>

        <p className="footer-text">
          Thank you for choosing NoteSight! We hope you enjoy using our application
          as much as we enjoyed creating it.
        </p>
      </div>

        {/* --- FOOTER --- */}
      <footer className="notesight-footer">
        <p>© 2025 <span>NoteSight</span> — All Rights Reserved</p>
      </footer>

      {/* Modal for member info */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{selected.name}</h3>
            <p>{selected.contributions}</p>
            <div className="socials">
              <a href={selected.socials.github} target="_blank" rel="noreferrer">
                GitHub
              </a>
              <a href={selected.socials.linkedin} target="_blank" rel="noreferrer">
                LinkedIn
              </a>
            </div>
            <button onClick={() => setSelected(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}