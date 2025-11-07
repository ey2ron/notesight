import { Navigation } from "../../components/Navigation/Navigation";
import musicIcon from "./assets/music.png";
import SecureIcon from "./assets/secure.png";
import SoundIcon from "./assets/sound.png";
import UserIcon from "./assets/user.png";
import "./Features.css";

export function Features() {
  return (
    <div className="features-page">
      <Navigation />

      <div className="features-content">
        <h1 className="features-heading">Features</h1>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <img src={SoundIcon} alt="Sound icon" />
            </div>
            <p>Instant audio playback of uploaded sheet music</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <img src={musicIcon} alt="Music icon" />
            </div>
            <p>Support for various musical notations and symbols</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <img src={UserIcon} alt="User icon" />
            </div>
            <p>User-friendly interface for easy navigation</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <img src={SecureIcon} alt="Secure icon" />
            </div>
            <p>Secure and private handling of user data</p>
          </div>
        </div>
      </div>
    </div>
  );
}
