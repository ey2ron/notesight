import { HashRouter as Router, Routes, Route } from 'react-router-dom';    
import { ToastContainer } from 'react-toastify';

import { LandingPage } from './pages/Landing/LandingPage'; 
import { Features } from './pages/Features/Features';
import { About } from './pages/About/About';
import { SignupPage } from './pages/Auth/Signuppage'; 
import { LoginPage } from './pages/Auth/Loginpage';
import { HomePage } from './pages/Home/HomePage';
import { XMLPlayerPage } from './pages/XMLPlayer/XMLPlayer';
import { OMRUpload } from './components/OMRUpload';



function App() {
  return (
    <Router>
      <Routes>
	    <Route path="/" element={<LandingPage />} />
	    <Route path="/features" element={<Features />} />
	    <Route path="/about" element={<About />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/xmlplayer" element={<XMLPlayerPage />} />
        <Route path="/omr" element={<OMRUpload />} />
      </Routes>
      <ToastContainer/>
    </Router>
  );
}

export default App;
