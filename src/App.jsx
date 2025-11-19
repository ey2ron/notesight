import { HashRouter as Router, Routes, Route } from 'react-router-dom';    
import { ToastContainer } from 'react-toastify';

import { LandingPage } from './pages/Landing/LandingPage'; 
import { SignupPage } from './pages/Auth/Signuppage'; 
import { LoginPage } from './pages/Auth/Loginpage';
import { HomePage } from './pages/Home/HomePage';
import { XMLPlayerPage } from './pages/XMLPlayer/XMLPlayer';



function App() {
  return (
    <Router>
      <Routes>
	    <Route path="/" element={<LandingPage />} />
	    <Route path="/features" element={<LandingPage section="features" />} />
	    <Route path="/about" element={<LandingPage section="about" />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/xmlplayer" element={<XMLPlayerPage />} />
      </Routes>
      <ToastContainer/>
    </Router>
  );
}

export default App;
