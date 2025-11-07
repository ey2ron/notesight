import './Navigation.css';
import { NavLink, Link } from 'react-router-dom';

export function Navigation() {
  return (
    <header className="navbar">
      <div className="navbar__inner">
        <div className="logo-section">
          <Link to="/" className="logo-text">
            NoteSight
          </Link>
        </div>

        <nav className="nav-links">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link nav-link--active' : 'nav-link'}>
            Home
          </NavLink>
          <NavLink to="/features" className={({ isActive }) => isActive ? 'nav-link nav-link--active' : 'nav-link'}>
            Features
          </NavLink>
          <NavLink to="/about" className={({ isActive }) => isActive ? 'nav-link nav-link--active' : 'nav-link'}>
            About
          </NavLink>
          
        </nav>

        <Link to="/signup" className="cta-button">
          Get Started
        </Link>
      </div>
    </header>
  );
}
