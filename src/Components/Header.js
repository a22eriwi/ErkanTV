import { useState} from 'react';
import { Link, NavLink} from 'react-router-dom';
import { useAuth } from '../authContext';

function Header() {
  const { isLoggedIn, user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleMenu = () => setMenuOpen(prev => !prev);
  
  return (
    <header className={`header ${menuOpen ? 'open' : 'closed'}`}>
      <Link className='logga' to="/home">
        ErkanTV
      </Link>
      {isLoggedIn && (
        <>
          <NavLink to="/home" className={({ isActive }) => `nav ${isActive ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>Home</NavLink>
          <NavLink to="/wish" className={({ isActive }) => `nav ${isActive ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>Wishlist</NavLink>
          <NavLink to="/movies" className={({ isActive }) => `nav ${isActive ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>Movies</NavLink>
          <NavLink to="/series" className={({ isActive }) => `nav ${isActive ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>Series</NavLink>
        </>
      )}

      <div className='signDiv'>
       {isLoggedIn ? (
          <>
            {/* Hamburger button for mobile */}
            <button className={`menuButton ${menuOpen ? 'open' : ''}`} onClick={toggleMenu}>
              <span></span>
              <span></span>
              <span></span>
            </button>
            {user?.role === 'admin' && (
              <Link className="adminKnapp" to="/admin" onClick={() => setMenuOpen(false)}>Admin</Link>
            )}
            <Link
              className="signinKnapp"
              to="/"
              onClick={() => {
                logout();
                setMenuOpen(false);
              }}
            >
              Sign out
            </Link>
          </>
        ) : (
          <Link className="signinKnapp" to="/login" onClick={() => setMenuOpen(false)}>Sign in</Link>
        )}
      </div>
    </header>
  );
}

export default Header;