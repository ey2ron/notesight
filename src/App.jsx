import { HashRouter as Router, Routes, Route } from 'react-router-dom';    
import { ToastContainer } from 'react-toastify';

import { LandingPage } from './pages/Landing/LandingPage'; 
import { Features } from './pages/Features/Features';
import { About } from './pages/About/About';
import { SignupPage } from './pages/Auth/Signuppage'; 
import { LoginPage } from './pages/Auth/Loginpage';



function App() {
  return (
    <Router>
      <Routes>
		    <Route path="/" element={<LandingPage />} />
		    <Route path="/features" element={<Features />} />
		    <Route path="/about" element={<About />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<LoginPage />} />
      </Routes>
      <ToastContainer/>
    </Router>
  );
}

export default App;
