import "./LandingPage.css";
import { Navigation } from "../../components/Navigation/Navigation";
import { useNavigate } from "react-router-dom"; 

export function LandingPage() {
  const navigate = useNavigate(); 

  const handleGetStarted = () => {
    navigate("/signup"); 
  };

  return (
    <div className="landing-container">
      <Navigation />
      <main className="content">
        <div className="text-section">
          <h1>
            Welcome to <br />
            <span>NoteSight</span>
          </h1>
          <p>see the notes, hear the future</p>
        </div>
        <button className="get-started" onClick={handleGetStarted}>
          Get Started
        </button>
      </main>
    </div>
  );
}
