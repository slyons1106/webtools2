import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const AuthStatus: React.FC = () => {
  const auth = useContext(AuthContext);

  if (!auth) {
    throw new Error('AuthContext must be used within an AuthProvider');
  }

  const handleLogout = () => {
    auth.logout();
  };

  return (
    <div>
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

  return (
    <nav>
      <ul>
        <li>
          <Link to="/">Home</Link>
        </li>
        <li>
          <Link to="/admin">Admin</Link>
        </li>
        <li>
          <Link to="/page1">Page 1</Link>
        </li>
        <li>
          <Link to="/page2">Page 2</Link>
        </li>
        <li>
          <Link to="/page3">Page 3</Link>
        </li>
        {auth.isAuthenticated && auth.role === 'ADMIN' && (
          <>
            <li>
              <Link to="/page4">Page 4</Link>
            </li>
            <li>
              <Link to="/page5">Page 5</Link>
            </li>
            <li>
              <Link to="/page6">Page 6</Link>
            </li>
          </>
        )}
        <li>
          <Link to="/login">Login</Link>
        </li>
      </ul>
      <AuthStatus />
    </nav>
  );
};

export default Navigation;
