import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './Navigation.css'; // Import the CSS file

const AuthStatus: React.FC = () => {
  const auth = useContext(AuthContext);

  if (!auth) {
    throw new Error('AuthContext must be used within an AuthProvider');
  }

  const handleLogout = () => {
    auth.logout();
  };

  return (
    <div className="auth-status-container">
      {auth.isAuthenticated ? (
        <>
          <span>Welcome, {auth.role}!</span>
          <button onClick={handleLogout}>Logout</button>
        </>
      ) : (
        <span>You are not logged in.</span>
      )}
    </div>
  );
};

const Navigation: React.FC = () => {
  const auth = useContext(AuthContext);

  if (!auth) {
    throw new Error('AuthContext must be used within an AuthProvider');
  }

  // Helper to check if a user can access a page
  const canAccess = (path: string) => {
    return auth.isAuthenticated && auth.allowedPages && auth.allowedPages.includes(path);
  };

  return (
    <nav>
      <ul className="navigation-list">
        {auth.isAuthenticated && (
          <li>
            <Link to="/">Home</Link>
          </li>
        )}
        {auth.isAuthenticated && auth.role === 'ADMIN' && (
          <li>
            <Link to="/admin">Admin</Link>
          </li>
        )}
        {canAccess('/page1') && (
          <li>
            <Link to="/page1">Page 1</Link>
          </li>
        )}
        {canAccess('/page2') && (
          <li>
            <Link to="/page2">Page 2</Link>
          </li>
        )}
        {canAccess('/page3') && (
          <li>
            <Link to="/page3">Page 3</Link>
          </li>
        )}
        {canAccess('/page4') && (
          <li>
            <Link to="/page4">Page 4</Link>
          </li>
        )}
        {canAccess('/page5') && (
          <li>
            <Link to="/page5">Page 5</Link>
          </li>
        )}
        {canAccess('/page6') && (
          <li>
            <Link to="/page6">Page 6</Link>
          </li>
        )}
        {!auth.isAuthenticated && (
          <li>
            <Link to="/login">Login</Link>
          </li>
        )}
      </ul>
      <AuthStatus />
    </nav>
  );
};

export default Navigation;
