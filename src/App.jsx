import { HashRouter as Router, Routes, Route } from 'react-router-dom';    
import { AuthPage } from './pages/Auth/AuthPage';
import { LandingPage } from './pages/Landing/LandingPage'; 
import { Features } from './pages/Features/Features';
import { About } from './pages/About/About';
import { HomePage } from './pages/Home/HomePage';


function App() {
  return (
    <Router>
      <Routes>
		
		<Route path="/auth" element={<AuthPage />} />
		<Route path="/features" element={<Features />} />
		<Route path="/about" element={<About />} />
    <Route path="/" element={<HomePage />} />
      </Routes>
    </Router>
  );
}

export default App;
