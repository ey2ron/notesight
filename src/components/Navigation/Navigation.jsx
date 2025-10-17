import './Navigation.css';
import { Link } from 'react-router-dom';

export function Navigation() {
  return (
    <header className="navbar">
      <div className="logo-section">
         <Link to="/" className="logo-text">NoteSight</Link>
      </div>

      <nav className="nav-links">
        <Link to="/about">About</Link>
        <Link to="/features">Features</Link>
      </nav>
    </header>
  );
}
